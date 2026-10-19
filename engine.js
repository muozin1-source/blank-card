/* Pure puzzle rules. No DOM, storage, network or external dependencies. */
(function(root){
  'use strict';
  const N=6, SIZE=36;
  const units=[];
  for(let r=0;r<N;r++)units.push(Array.from({length:N},(_,c)=>r*N+c));
  for(let c=0;c<N;c++)units.push(Array.from({length:N},(_,r)=>r*N+c));
  function validBoard(b){return Array.isArray(b)&&b.length===SIZE&&b.every(n=>Number.isInteger(n)&&n>=0&&n<=N);}
  function candidates(b,i){if(b[i])return [];return [1,2,3,4,5,6].filter(n=>!units[Math.floor(i/N)].some(j=>b[j]===n)&&!units[N+i%N].some(j=>b[j]===n));}
  function consistent(b){return validBoard(b)&&units.every(u=>{const a=u.map(i=>b[i]).filter(Boolean);return new Set(a).size===a.length;});}
  function conflicts(b,i,n){return [...new Set([...units[Math.floor(i/N)],...units[N+i%N]])].filter(j=>j!==i&&b[j]===n);}
  function countSolutions(input,limit=2){
    if(!consistent(input))return 0;
    const b=input.slice();let count=0;
    function visit(){
      let target=-1, opts=null;
      for(let i=0;i<SIZE;i++)if(!b[i]){const a=candidates(b,i);if(!a.length)return;if(opts===null||a.length<opts.length){target=i;opts=a;if(a.length===1)break;}}
      if(target<0){count++;return;}
      for(const n of opts){b[target]=n;visit();b[target]=0;if(count>=limit)return;}
    }
    visit();return count;
  }
  function logicalSolve(input){
    if(!consistent(input))return null;
    const b=input.slice();
    while(b.includes(0)){
      const opts=b.map((_,i)=>candidates(b,i));
      if(b.some((n,i)=>!n&&!opts[i].length))return null;
      let spot=b.findIndex((n,i)=>!n&&opts[i].length===1),value=spot<0?0:opts[spot][0];
      if(spot<0){
        outer:for(const u of units)for(let n=1;n<=N;n++){
          if(u.some(i=>b[i]===n))continue;
          const places=u.filter(i=>!b[i]&&opts[i].includes(n));
          if(!places.length)return null;
          if(places.length===1){spot=places[0];value=n;break outer;}
        }
      }
      if(spot<0)return null;
      b[spot]=value;
    }
    return b;
  }
  function shuffle(a,rng){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
  function generate(rng=Math.random){
    const rows=shuffle([0,1,2,3,4,5],rng),cols=shuffle([0,1,2,3,4,5],rng),symbols=shuffle([1,2,3,4,5,6],rng);
    const b=rows.flatMap(r=>cols.map(c=>symbols[(r+c)%N]));
    for(const i of shuffle(Array.from({length:SIZE},(_,i)=>i),rng)){
      if(b.filter(n=>!n).length>=21)break;
      const n=b[i];b[i]=0;
      if(countSolutions(b)!==1||!logicalSolve(b))b[i]=n;
    }
    return b;
  }
  const api={N,validBoard,consistent,candidates,conflicts,countSolutions,logicalSolve,generate};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.CardEngine=api;
})(typeof window==='undefined'?{}:window);
