/* Presentation-only chart helpers. No entry logic or alerts. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.PrimeChartExtras=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function ema(prices,n){
    const results=Array(prices.length).fill(null);
    if(prices.length<n)return results;
    let p=prices.slice(0,n).reduce((a,b)=>a+b,0)/n;
    results[n-1]=p;
    const alpha=2/(n+1);
    for(let i=n;i<prices.length;i++){
      p=alpha*prices[i]+(1-alpha)*p;
      results[i]=p;
    }
    return results;
  }
  function crossMarkers(candles,max=2){
    if(!Array.isArray(candles)||candles.length<22)return [];
    const close=candles.map(x=>Number(x.c)),a=ema(close,9),b=ema(close,21);
    const markers=[];
    for(let i=Math.max(21,candles.length-60);i<candles.length;i++){
      const t=Number(candles[i].t);
      if(!Number.isFinite(t)||!Number.isFinite(close[i]))continue;
      const bullish=a[i-1]<=b[i-1]&&a[i]>b[i];
      const bearish=a[i-1]>=b[i-1]&&a[i]<b[i];
      if(!bullish&&!bearish)continue;
      markers.push({
        time:Math.floor(t/1000),
        position:bullish?'belowBar':'aboveBar',
        color:bullish?'#21d6a5':'#ff637c',
        shape:bullish?'arrowUp':'arrowDown'
      });
    }
    return markers.slice(-Math.min(2,Math.max(0,max)));
  }
  // Two nearest *confirmed* swing levels, computed from closed market candles.
  // The last 3 candles are not eligible as pivot centers (need right-side bars).
  function supportResistance(candles,lookback=120){
    if(!Array.isArray(candles)||candles.length<24)return {support:null,resistance:null};
    const valid=candles.filter(c=>Number.isFinite(Number(c.h))&&Number.isFinite(Number(c.l))&&
      Number.isFinite(Number(c.c))&&Number(c.h)>=Number(c.l)&&Number(c.c)>0).slice(-lookback);
    if(valid.length<24)return {support:null,resistance:null};
    const price=Number(valid[valid.length-1].c),left=3,right=3;
    const highs=[],lows=[];
    for(let i=left;i<valid.length-right;i++){
      const hi=Number(valid[i].h),lo=Number(valid[i].l);
      const before=valid.slice(i-left,i),after=valid.slice(i+1,i+right+1);
      if(before.every(x=>hi>Number(x.h))&&after.every(x=>hi>=Number(x.h)))highs.push(hi);
      if(before.every(x=>lo<Number(x.l))&&after.every(x=>lo<=Number(x.l)))lows.push(lo);
    }
    // Do not invent levels when no confirmed swing exists on the appropriate side.
    const support=lows.filter(v=>v<price).sort((a,b)=>b-a)[0]??null;
    const resistance=highs.filter(v=>v>price).sort((a,b)=>a-b)[0]??null;
    return {support,resistance};
  }
  function signalStatus(analysis,confirmed){
    if(confirmed&&confirmed.confirmed===true){
      return {label:'CONFIRMED '+(confirmed.side==='SHORT'?'SHORT':'LONG'),kind:'confirmed'};
    }
    if(analysis&&analysis.aligned===true&&Number(analysis.vr)>=1.5){
      return {label:'EARLY WATCH · NOT CONFIRMED',kind:'early'};
    }
    return {label:'WAIT · NO ENTRY',kind:'wait'};
  }
  function candleCountdown(timeframe,now=Date.now()){
    const ms={'1m':60000,'5m':300000,'15m':900000,'1h':3600000,
      '4h':14400000,'1d':86400000}[timeframe];
    if(!ms||!Number.isFinite(now))return null;
    const remaining=ms-(now%ms);
    const seconds=Math.ceil(remaining/1000);
    return {remainingMs:remaining,label:
      String(Math.floor(seconds/3600)).padStart(2,'0')+':'+
      String(Math.floor((seconds%3600)/60)).padStart(2,'0')+':'+
      String(seconds%60).padStart(2,'0')};
  }
  return {crossMarkers,supportResistance,signalStatus,candleCountdown};
});
