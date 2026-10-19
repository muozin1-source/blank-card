/* VoiceOver owns speech. Only explicit number selection opens a focus-managed dialog. */
(() => {
  'use strict';
  const E=window.CardEngine,$=id=>document.getElementById(id),KEY='blank-card-save-v1';
  let state,liveTimer,storageWarning=false;
  const cells=[],numberButtons=[];
  const where=i=>`${Math.floor(i/6)+1}행 ${i%6+1}열`;
  const describe=i=>state.board[i]?`${state.board[i]}, ${state.given[i]?'고정':'입력'}`:'빈칸';
  const remaining=()=>state.board.filter(n=>!n).length;
  function normalizeSnapshot(s,given){
    if(!s||!E.consistent(s.board)||given.some((n,i)=>n&&s.board[i]!==n)||!Number.isInteger(s.selected)||s.selected<0||s.selected>=36)return null;
    return {board:s.board.slice(),selected:s.selected};
  }
  function load(){
    try{
      const raw=localStorage.getItem(KEY);if(!raw)return false;
      const saved=JSON.parse(raw);
      if(![1,2].includes(saved.version)||!E.consistent(saved.given)||E.countSolutions(saved.given)!==1||!E.logicalSolve(saved.given))return false;
      const restored=normalizeSnapshot(saved,saved.given);if(!restored)return false;
      state={given:saved.given.slice(),...restored};
      return true;
    }catch{return false;}
  }
  function save(){try{localStorage.setItem(KEY,JSON.stringify({version:2,...state}));}catch{if(!storageWarning){storageWarning=true;setTimeout(()=>announce('이 브라우저에 저장할 수 없습니다. 창을 닫으면 진행이 사라질 수 있습니다.'),700);}}}
  function announce(text,error=false){
    $('message').textContent=text;
    document.querySelector('.inspector').dataset.error=String(error);
    clearTimeout(liveTimer);$('live').textContent='';$('picker-message').textContent='';
    const target=$('number-dialog').open?$('picker-message'):$('live');
    liveTimer=setTimeout(()=>{target.textContent=text;},60);
  }
  function render(){
    cells.forEach((el,i)=>{
      const n=state.board[i],fixed=Boolean(state.given[i]);
      el.replaceChildren();
      const span=document.createElement('span');span.textContent=n||'—';span.className=n?'':'empty';el.append(span);
      el.dataset.given=String(fixed);el.dataset.selected=String(i===state.selected);el.dataset.related=String(Math.floor(i/6)===Math.floor(state.selected/6)||i%6===state.selected%6);el.dataset.user=String(Boolean(n)&&!fixed);
      el.setAttribute('aria-label',`${where(i)}, ${describe(i)}${i===state.selected?', 선택됨':''}`);
    });
    $('progress').textContent=remaining()?`6 × 6 · 빈자리 ${remaining()}칸`:'완성했습니다';
    $('selection').textContent=`${where(state.selected)} · ${describe(state.selected)}`;
    numberButtons.forEach((el,i)=>el.setAttribute('aria-label',`${i+1} 놓기`));
  }
  function select(i){
    state.selected=i;render();save();
    announce(`${where(i)}, ${describe(i)}`);
  }
  function positionNumbers(){
    const dialog=$('number-dialog');if(!dialog.open)return;
    const card=cells[state.selected].getBoundingClientRect(),box=dialog.getBoundingClientRect();
    const viewport=window.visualViewport;
    const left=viewport?viewport.offsetLeft:0,top=viewport?viewport.offsetTop:0;
    const width=viewport?viewport.width:innerWidth,height=viewport?viewport.height:innerHeight;
    const x=Math.max(left+12,Math.min(card.left+card.width/2-box.width/2,left+width-box.width-12));
    const below=card.bottom+8,above=card.top-box.height-8;
    const preferred=below+box.height<=top+height-12?below:above;
    dialog.style.left=`${x}px`;dialog.style.top=`${Math.max(top+12,Math.min(preferred,top+height-box.height-12))}px`;
  }
  function openNumbers(){
    if(state.given[state.selected]){announce('고정 카드입니다. 빈자리 또는 놓은 카드를 선택하세요.',true);return;}
    clearTimeout(liveTimer);$('live').textContent='';
    $('number-title').textContent=`${where(state.selected)} · ${describe(state.selected)} · 숫자 선택`;
    $('picker-message').textContent=state.board[state.selected]?`직접 입력한 ${state.board[state.selected]} 카드입니다. 변경할 수 있습니다.`:'아직 숫자가 없는 빈칸입니다. 놓을 숫자를 선택하세요.';
    $('number-dialog').showModal();positionNumbers();numberButtons[0].focus({preventScroll:true});
  }
  function closeNumbers(){clearTimeout(liveTimer);if($('number-dialog').open)$('number-dialog').close();}
  function put(n){
    const i=state.selected;
    if(state.given[i]){announce('처음부터 놓인 고정 카드입니다. 빈자리를 선택하세요.',true);return;}
    if(state.board[i]===n){closeNumbers();announce(`${where(i)}에는 이미 ${n} 카드가 있습니다.`);return;}
    const duplicates=E.conflicts(state.board,i,n);
    if(duplicates.length){announce(`놓을 수 없습니다. ${where(duplicates[0])}에 이미 ${describe(duplicates[0])} 카드가 있습니다.`,true);return;}
    state.board[i]=n;render();save();closeNumbers();
    announce(remaining()?`${where(i)}, ${n} 놓음. `:'완성했습니다! 가로와 세로에 1부터 6까지 한 번씩 놓았습니다.');
  }
  function erase(){
    const i=state.selected;if(state.given[i]){announce('고정 카드는 지울 수 없습니다.',true);return;}
    if(!state.board[i]){announce('이미 빈칸입니다.');return;}
    state.board[i]=0;render();save();announce(`${where(i)}, 카드 지움. `);
  }
  function readLine(column){
    const index=column?state.selected%6:Math.floor(state.selected/6);
    const values=Array.from({length:6},(_,k)=>{const i=column?k*6+index:index*6+k;return `${i===state.selected?'선택한 ':''}${k+1}${column?'행':'열'} ${describe(i)}`;});
    announce(`${index+1}${column?'열':'행'}. ${values.join('. ')}. `);
  }
  function start(){const given=E.generate();state={given,board:given.slice(),selected:given.indexOf(0)};render();save();announce(`새 판. 빈자리 ${remaining()}칸. ${where(state.selected)}, 빈칸. `);}
  $('board').append(Object.assign(document.createElement('span'),{className:'axis'}));
  for(let r=0;r<7;r++){
    if(r===0){for(let c=1;c<=6;c++){const s=document.createElement('span');s.className='axis';s.textContent=c;s.setAttribute('aria-hidden','true');$('board').append(s);}continue;}
    const axis=document.createElement('span');axis.className='axis';axis.textContent=r;axis.setAttribute('aria-hidden','true');$('board').append(axis);
    for(let c=0;c<6;c++){
      const i=(r-1)*6+c,el=document.createElement('button');el.type='button';el.className='cell';el.addEventListener('click',()=>{select(i);if(!state.given[i])openNumbers();});
      el.addEventListener('keydown',e=>{
        const r=Math.floor(i/6),c=i%6;let target=i;
        if(e.key==='ArrowLeft')target=r*6+Math.max(0,c-1);else if(e.key==='ArrowRight')target=r*6+Math.min(5,c+1);else if(e.key==='ArrowUp')target=Math.max(0,r-1)*6+c;else if(e.key==='ArrowDown')target=Math.min(5,r+1)*6+c;
        else if(/^[1-6]$/.test(e.key)){e.preventDefault();if(state.selected!==i)select(i);put(Number(e.key));return;}
        else if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();if(state.selected!==i)select(i);erase();return;}else return;
        e.preventDefault();select(target);cells[target].focus({preventScroll:true});
      });cells.push(el);$('board').append(el);
    }
  }
  for(let n=1;n<=6;n++){const el=document.createElement('button');el.type='button';el.className='number';el.textContent=n;el.addEventListener('click',()=>put(n));numberButtons.push(el);$('numbers').append(el);}
  $('read-row').onclick=()=>readLine(false);$('read-column').onclick=()=>readLine(true);
  $('picker-row').onclick=()=>readLine(false);$('picker-column').onclick=()=>readLine(true);
  $('number-open').onclick=()=>openNumbers();$('number-cancel').onclick=closeNumbers;
  $('number-dialog').addEventListener('close',()=>{$('picker-message').textContent='';$('number-open').focus({preventScroll:true});});
  $('number-dialog').addEventListener('cancel',()=>clearTimeout(liveTimer));
  $('number-dialog').addEventListener('keydown',e=>{if(/^[1-6]$/.test(e.key)){e.preventDefault();put(Number(e.key));}});
  window.addEventListener('resize',positionNumbers);window.visualViewport?.addEventListener('resize',positionNumbers);
  $('summary').onclick=()=>announce(`6행 6열. 빈자리 ${remaining()}칸. 현재 ${where(state.selected)}. `);
  $('erase').onclick=erase;
  $('new-open').onclick=()=>$('new-dialog').showModal();
  $('new-cancel').onclick=()=>$('new-dialog').close();$('new-confirm').onclick=()=>{$('new-dialog').close();start();};
  if(load()){render();$('message').textContent=`진행을 이어갑니다. ${where(state.selected)}. 가로·세로를 확인하세요.`;}else start();
})();
