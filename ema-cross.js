/* EMA9/21 cross discovery only. Never emits confirmed trade entries. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.PrimeCross=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function ema(values,period){
    if(values.length<period)return [];
    const output=Array(values.length).fill(null);
    let previous=values.slice(0,period).reduce((sum,v)=>sum+v,0)/period;
    output[period-1]=previous;
    const alpha=2/(period+1);
    for(let i=period;i<values.length;i++){
      previous=values[i]*alpha+previous*(1-alpha);
      output[i]=previous;
    }
    return output;
  }
  function detect(rows,intervalMs,nowMs=Date.now(),lookback=4){
    if(!Array.isArray(rows)||!Number.isFinite(intervalMs)||intervalMs<=0)return null;
    // Deduplicate and exclude the in-progress candle; never claim a live-bar cross.
    const completed=[...new Map(rows.filter(row=>
      Number.isFinite(Number(row.t))&&Number.isFinite(Number(row.c))&&
      Number(row.c)>0&&Number(row.t)+intervalMs<=nowMs
    ).map(row=>[Number(row.t),row])).values()]
      .sort((a,b)=>Number(a.t)-Number(b.t));
    if(completed.length<35)return null;
    const closes=completed.map(row=>Number(row.c));
    const fast=ema(closes,9),slow=ema(closes,21);
    for(let i=completed.length-1;i>=Math.max(21,completed.length-lookback);i--){
      if(!Number.isFinite(fast[i])||!Number.isFinite(slow[i])||
         !Number.isFinite(fast[i-1])||!Number.isFinite(slow[i-1]))continue;
      const bullish=fast[i-1]<=slow[i-1]&&fast[i]>slow[i];
      const bearish=fast[i-1]>=slow[i-1]&&fast[i]<slow[i];
      if(!bullish&&!bearish)continue;
      // If a reverse cross has happened after this one, display the newest only.
      const baseline=completed.slice(Math.max(0,i-20),i)
        .reduce((sum,row)=>sum+Number(row.v||0),0)/Math.min(20,i);
      const volume=Number(completed[i].v);
      const eventTime=Number(completed[i].t)+intervalMs;
      return {
        direction:bullish?'BUY CROSS':'SELL CROSS',
        candle: Number(completed[i].t),
        time:eventTime,
        ageMs:Math.max(0,nowMs-eventTime),
        price:Number(completed[i].c),
        volumeRatio:baseline>0&&Number.isFinite(volume)?volume/baseline:null,
        ema9:fast[i],ema21:slow[i]
      };
    }
    return null;
  }
  return {ema,detect};
});
