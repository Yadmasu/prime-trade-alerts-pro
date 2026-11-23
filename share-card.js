/* PRIME TRADE ALERTS PRO — share-only PNG compositor.
 * Never changes analysis, trading signals, or the live chart. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.PrimeShareCard=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function cardMeta(snapshot){
    if(!snapshot||!Array.isArray(snapshot.candles)||!snapshot.candles.length)throw Error('Chart data unavailable');
    const last=snapshot.candles.at(-1);
    const confirmed=snapshot.confirmed?.confirmed===true;
    const side=confirmed?snapshot.confirmed.side:snapshot.analysis?.side;
    const direction=side==='LONG'?'BULLISH':side==='SHORT'?'BEARISH':'NEUTRAL';
    const price=Number(last.c);
    if(!Number.isFinite(price)||price<=0)throw Error('Valid market price unavailable');
    return {
      id:String(snapshot.id||'MARKET'),tf:String(snapshot.timeframe||'—').toUpperCase(),
      price,candleTime:Number(last.t),confirmed,direction,
      headline:confirmed?'CONFIRMED '+(side==='SHORT'?'SHORT':'LONG'):'WAIT · NO CONFIRMED ENTRY',
      levels:confirmed?snapshot.confirmed:null
    };
  }
  function formatPrice(p){
    if(!Number.isFinite(p))return '—';
    return p>=1000?p.toLocaleString('en-US',{maximumFractionDigits:2}):
      p>=1?p.toFixed(3):p>=.01?p.toFixed(4):p.toFixed(6);
  }
  function drawShareCard(snapshot,source,extras){
    const m=cardMeta(snapshot);
    if(!source||!source.width||!source.height)throw Error('Rendered chart unavailable');
    const c=document.createElement('canvas');c.width=1400;c.height=900;
    const ctx=c.getContext('2d');
    if(!ctx)throw Error('Canvas not supported');
    const background=ctx.createLinearGradient(0,0,1400,900);
    background.addColorStop(0,'#101d31');background.addColorStop(1,'#07111f');
    ctx.fillStyle=background;ctx.fillRect(0,0,1400,900);
    ctx.fillStyle='#0b1727';ctx.fillRect(28,24,1344,852);
    ctx.strokeStyle='#273f58';ctx.lineWidth=2;ctx.strokeRect(28,24,1344,852);
    const txt=(value,x,y,font,color,align='left')=>{
      ctx.font=font;ctx.textAlign=align;ctx.fillStyle=color;ctx.fillText(String(value),x,y);
      ctx.textAlign='left';
    };
    ctx.fillStyle='#2ed0a5';ctx.fillRect(52,46,7,53);
    txt('PRIME',76,83,'800 35px system-ui','#eef6ff');
    txt('TRADE ALERTS PRO',208,83,'800 35px system-ui','#2ed0a5');
    txt('HYPERLIQUID · MARKET CHART',54,122,'600 17px system-ui','#9daec1');
    txt(m.id+'  /  '+m.tf,54,173,'800 34px system-ui','#edf5ff');
    const stateColor=m.confirmed?(m.direction==='BULLISH'?'#31d1a3':'#f97888'):'#f4c36e';
    txt(m.headline,1342,170,'800 23px system-ui',stateColor,'right');
    ctx.fillStyle='#101e30';ctx.fillRect(52,194,1025,595);
    ctx.strokeStyle='#314963';ctx.strokeRect(52,194,1025,595);
    // Fills the frame without stretching the price-to-time proportions.
    const scale=Math.min(1023/source.width,593/source.height);
    const dw=source.width*scale,dh=source.height*scale;
    ctx.drawImage(source,52+(1025-dw)/2,194+(595-dh)/2,dw,dh);
    ctx.fillStyle='#14243a';ctx.fillRect(1092,194,244,595);
    const divider=y=>{ctx.strokeStyle='#29415c';ctx.beginPath();ctx.moveTo(1114,y);ctx.lineTo(1315,y);ctx.stroke();};
    txt('MARKET PRICE',1114,231,'700 15px system-ui','#90abc3');
    txt(formatPrice(m.price),1114,271,'800 32px system-ui','#edf5ff');
    divider(299);
    txt('TREND',1114,337,'700 15px system-ui','#90abc3');
    txt(m.direction,1114,375,'800 25px system-ui',m.direction==='BULLISH'?'#31d1a3':m.direction==='BEARISH'?'#f97888':'#e6bb6b');
    divider(401);
    const sr=extras?.supportResistance?.(snapshot.candles)||{support:null,resistance:null};
    txt('SUPPORT',1114,440,'700 15px system-ui','#90abc3');
    txt(formatPrice(sr.support),1114,477,'800 26px system-ui','#31d1a3');
    divider(500);
    txt('RESISTANCE',1114,540,'700 15px system-ui','#90abc3');
    txt(formatPrice(sr.resistance),1114,577,'800 26px system-ui','#f97888');
    divider(603);
    if(m.confirmed&&m.levels){
      txt('ENTRY / SL / TP1',1114,640,'700 15px system-ui','#90abc3');
      txt(formatPrice(Number(m.levels.entry)),1114,676,'700 20px system-ui','#f4c36e');
      txt(formatPrice(Number(m.levels.stop))+' / '+formatPrice(Number(m.levels.tp1)),1114,706,'650 17px system-ui','#edf5ff');
      txt('TP2  '+formatPrice(Number(m.levels.tp2)),1114,735,'600 17px system-ui','#90abc3');
      txt('TP3  '+formatPrice(Number(m.levels.tp3)),1114,764,'600 17px system-ui','#90abc3');
    }else{
      txt('RESEARCH ONLY',1114,663,'800 20px system-ui','#f4c36e');
      txt('NOT A TRADE SIGNAL',1114,693,'650 16px system-ui','#d1dce8');
    }
    const stamp=Number.isFinite(m.candleTime)?new Date(m.candleTime).toISOString().slice(0,16).replace('T',' ')+' UTC':'Time unavailable';
    txt('Candle: '+stamp,54,825,'600 17px system-ui','#a4b7c8');
    txt('EMA9  /  EMA21  ·  Volume  ·  Support  /  Resistance',54,852,'500 16px system-ui','#90abc3');
    txt('I’m not a financial advisor · For educational purposes only',1342,850,'600 14px system-ui','#a4b7c8','right');
    return c;
  }
  return {cardMeta,formatPrice,drawShareCard};
});
