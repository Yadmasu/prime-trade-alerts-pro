/* PRIME TRADE ALERTS PRO | independently rendered, data-faithful share PNG.
   Presentation only; never modifies live charts, signals, or notification flow. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.PrimeShareCard=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const COLOR={bg:'#081321',panel:'#0c1b2b',grid:'#20364a',white:'#edf5ff',
  muted:'#9db1c6',up:'#21c99e',down:'#f57682',blue:'#58a6ff',
  orange:'#f6a23a',support:'#2dc5a4',resistance:'#f28b91',gold:'#efc36d'};
const formatPrice=p=>{
  if(!Number.isFinite(p))return '—';
  if(p>=1000)return p.toLocaleString('en-US',{maximumFractionDigits:2});
  if(p>=1)return p.toFixed(3);
  if(p>=.01)return p.toFixed(4);
  return p.toFixed(6);
};
function validatedCandles(rows){
  if(!Array.isArray(rows)||rows.length<30)throw Error('At least 30 valid candles are required to share');
  const arr=rows.map(c=>({t:Number(c.t),o:Number(c.o),h:Number(c.h),
    l:Number(c.l),c:Number(c.c),v:Number(c.v)}));
  if(arr.some(c=>!Object.values(c).every(Number.isFinite)||c.c<=0||
      c.l<=0||c.h<c.l||Math.max(c.o,c.c)>c.h||Math.min(c.o,c.c)<c.l||
      c.v<0))throw Error('Invalid market candle data');
  for(let i=1;i<arr.length;i++){
    if(arr[i].t<=arr[i-1].t)throw Error('Candle timestamps not in order');
  }
  return arr;
}
function cardMeta(snapshot){
  if(!snapshot)throw Error('Chart data unavailable');
  const candles=validatedCandles(snapshot.candles);
  const last=candles.at(-1);
  const confirmed=snapshot.confirmed?.confirmed===true;
  const side=confirmed?snapshot.confirmed.side:snapshot.analysis?.side;
  if(confirmed&& !['LONG','SHORT'].includes(side))throw Error('Confirmed direction unavailable');
  const direction=side==='LONG'?'BULLISH':side==='SHORT'?'BEARISH':'NEUTRAL';
  const tf=String(snapshot.timeframe||'').toLowerCase();
  if(!['15m','1h','4h','1d','5m','1m'].includes(tf))throw Error('Chart timeframe unavailable');
  return {
    id:String(snapshot.id||'MARKET'),tf:tf.toUpperCase(),price:last.c,
    candleTime:last.t,confirmed,direction, candles,
    headline:confirmed?'CONFIRMED '+side:'WAIT · NO CONFIRMED ENTRY',
    levels:confirmed?snapshot.confirmed:null
  };
}
function ema(prices,period){
  const values=Array(prices.length).fill(null);
  if(prices.length<period)return values;
  let prior=prices.slice(0,period).reduce((a,b)=>a+b,0)/period;
  values[period-1]=prior;
  for(let i=period;i<prices.length;i++){
    prior=prior+(prices[i]-prior)*2/(period+1);values[i]=prior;
  }
  return values;
}
function drawingModel(snapshot,extras){
  const m=cardMeta(snapshot);
  const data=m.candles.slice(-68),all=m.candles;
  const sr=extras?.supportResistance?.(all)||{support:null,resistance:null};
  const price=m.price,levels=[];
  if(Number.isFinite(sr.support)&&sr.support>0&&sr.support<price)
    levels.push({name:'S',price:sr.support,color:COLOR.support});
  if(Number.isFinite(sr.resistance)&&sr.resistance>price)
    levels.push({name:'R',price:sr.resistance,color:COLOR.resistance});
  if(m.confirmed&&m.levels){
    for(const [name,key,color] of [
      ['ENTRY','entry',COLOR.gold],['SL','stop',COLOR.down],
      ['TP1','tp1',COLOR.up],['TP2','tp2',COLOR.up],['TP3','tp3',COLOR.up]]){
      const value=Number(m.levels[key]);
      if(!Number.isFinite(value)||value<=0)throw Error('Incomplete confirmed trade levels');
      levels.push({name,price:value,color});
    }
  }
  // S/R must not change the price scale for distant, off-screen swings.
  let low=Math.min(...data.map(x=>x.l)),high=Math.max(...data.map(x=>x.h));
  const range=Math.max(high-low,price*.003);
  low-=range*.12;high+=range*.12;
  return {...m,data,all,levels,sr,low,high,
    ema9:ema(all.map(x=>x.c),9).slice(-data.length),
    ema21:ema(all.map(x=>x.c),21).slice(-data.length)};
}
function drawShareCard(snapshot,source,extras){
  // Always render our own price/volume/EMA chart from source candles. A screenshot
  // can carry cropped overlays, toolbars, cross labels and incorrect aspect ratios.
  const m=drawingModel(snapshot,extras);
  if(typeof document==='undefined')throw Error('Canvas rendering needs a browser');
  const cv=document.createElement('canvas');
  cv.width=1080;cv.height=1440;
  const g=cv.getContext('2d');
  if(!g)throw Error('PNG renderer unavailable');
  const rect=(x,y,w,h,color)=>{g.fillStyle=color;g.fillRect(x,y,w,h);};
  const text=(value,x,y,size,color,weight='600',align='left')=>{
    g.font=weight+' '+size+'px system-ui,-apple-system,sans-serif';
    g.textAlign=align;g.fillStyle=color;g.fillText(String(value),x,y);
    g.textAlign='left';
  };
  rect(0,0,1080,1440,COLOR.bg);
  rect(24,24,1032,1392,COLOR.panel);
  g.strokeStyle='#2c4359';g.lineWidth=2;g.strokeRect(24,24,1032,1392);
  rect(50,48,7,47,COLOR.support);
  text('PRIME',76,82,34,COLOR.white,'800');
  text('TRADE ALERTS PRO',205,82,34,COLOR.support,'800');
  text('HYPERLIQUID  •  MARKET CHART',52,120,16,COLOR.muted,'600');
  text(m.id+'  ·  '+m.tf,52,167,30,COLOR.white,'800');
  text(m.headline,1028,165,21,m.confirmed?
    (m.direction==='BULLISH'?COLOR.up:COLOR.down):COLOR.gold,'800','right');
  const frame={x:52,y:194,w:976,h:760},plot={x:72,y:220,w:830,h:610};
  rect(frame.x,frame.y,frame.w,frame.h,'#0a1929');
  g.strokeStyle='#334860';g.strokeRect(frame.x,frame.y,frame.w,frame.h);
  const x=i=>plot.x+(i+.5)*plot.w/m.data.length;
  const y=p=>plot.y+(m.high-p)/(m.high-m.low)*plot.h;
  g.lineWidth=1;g.strokeStyle=COLOR.grid;
  for(let i=0;i<=5;i++){
    const py=plot.y+(plot.h*i/5);
    g.beginPath();g.moveTo(plot.x,py);g.lineTo(plot.x+plot.w,py);g.stroke();
    text(formatPrice(m.high-(m.high-m.low)*i/5),plot.x+plot.w+11,py+4,21,COLOR.muted,'500');
  }
  for(let i=0;i<5;i++){
    const px=plot.x+plot.w*i/4;
    g.beginPath();g.moveTo(px,plot.y);g.lineTo(px,plot.y+plot.h);g.stroke();
  }
  const barw=Math.max(3,Math.min(10,plot.w/m.data.length*.68));
  m.data.forEach((b,i)=>{
    const color=b.c>=b.o?COLOR.up:COLOR.down;
    g.strokeStyle=color;g.fillStyle=color;
    g.beginPath();g.moveTo(x(i),y(b.h));g.lineTo(x(i),y(b.l));g.stroke();
    const top=y(Math.max(b.o,b.c)),bot=y(Math.min(b.o,b.c));
    g.fillRect(x(i)-barw/2,top,barw,Math.max(1,bot-top));
  });
  const drawEma=(array,color)=>{
    g.strokeStyle=color;g.lineWidth=2.5;g.beginPath();let first=true;
    array.forEach((v,i)=>{if(!Number.isFinite(v))return;
      if(first){g.moveTo(x(i),y(v));first=false;}else g.lineTo(x(i),y(v));
    });if(!first)g.stroke();
  };
  drawEma(m.ema9,COLOR.blue);drawEma(m.ema21,COLOR.orange);
  // Pivot lines are intentionally thin; numeric tags live in the dedicated sidebar.
  for(const l of m.levels){
    if(l.price<m.low||l.price>m.high)continue;
    g.lineWidth=1;g.strokeStyle=l.color;g.setLineDash([6,7]);
    g.beginPath();g.moveTo(plot.x,y(l.price));g.lineTo(plot.x+plot.w,y(l.price));g.stroke();
    g.setLineDash([]);
  }
  rect(plot.x,850,plot.w,70,'#0c1a29');
  const peak=Math.max(1,...m.data.map(b=>b.v));
  m.data.forEach((b,i)=>{
    rect(x(i)-barw/2,918-65*b.v/peak,barw,65*b.v/peak,
      b.c>=b.o?'#2b8779':'#8e4b5a');
  });
  // Avoid extrapolating a real-time market price from the last candle close.
  text('EMA 9',plot.x,944,22,COLOR.blue,'700');
  text('EMA 21',plot.x+135,944,22,COLOR.orange,'700');
  text('VOLUME',plot.x+285,944,22,COLOR.muted,'700');
  rect(52,978,976,322,'#142439');
  const metric=(label,value,x,y,color)=> {
    text(label,x,y,20,COLOR.muted,'700');
    text(value,x,y+42,33,color,'800');
  };
  metric('LAST CHART PRICE',formatPrice(m.price),76,1016,COLOR.white);
  metric('TREND',m.direction,560,1016,m.direction==='BULLISH'?COLOR.up:m.direction==='BEARISH'?COLOR.down:COLOR.gold);
  metric('SUPPORT',formatPrice(m.sr.support),76,1110,COLOR.support);
  metric('RESISTANCE',formatPrice(m.sr.resistance),560,1110,COLOR.resistance);
  if(m.confirmed){
    const trades=[['ENTRY','entry',COLOR.gold],['SL','stop',COLOR.down],['TP1','tp1',COLOR.up],['TP2','tp2',COLOR.up],['TP3','tp3',COLOR.up]];
    trades.forEach(([label,key,color],i)=>{
      const px=76+i*190;
      text(label,px,1210,21,color,'800');
      text(formatPrice(Number(m.levels[key])),px,1250,25,COLOR.white,'800');
    });
  }else{
    text('RESEARCH ONLY — NOT AN ENTRY SIGNAL',76,1248,25,COLOR.gold,'800');
  }
  const stamp=new Date(m.candleTime);
  if(!Number.isFinite(stamp.getTime()))throw Error('Invalid candle time');
  text('CANDLE TIME  '+stamp.toISOString().slice(0,16).replace('T',' ')+' UTC',
    52,1342,22,COLOR.white,'600');
  text('S/R = confirmed swing pivots  •  Price is latest chart candle',52,1376,18,COLOR.muted);
  text('No financial advice.',1028,1400,16,COLOR.muted,'500','right');
  return cv;
}
return {cardMeta,formatPrice,validatedCandles,drawingModel,drawShareCard};
});
