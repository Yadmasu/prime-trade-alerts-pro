const test=require('node:test');
const assert=require('node:assert/strict');
const card=require('../share-card.js');
function snapshot(){
 return {id:'XRP',timeframe:'15m',
  candles:Array.from({length:40},(_,i)=>({t:Date.UTC(2026,10,23,10,i*15),o:.92,c:.94,h:.95,l:.91,v:100})),
  analysis:{side:'LONG',aligned:false},confirmed:{confirmed:false}};
}
test('WAIT share card cannot imply LONG entry',()=>{
 const m=card.cardMeta(snapshot());
 assert.equal(m.headline,'WAIT · NO CONFIRMED ENTRY');
 assert.equal(m.direction,'BULLISH');
 assert.equal(m.levels,null);
});
test('real confirmed levels only when backend confirmed',()=>{
 const s=snapshot();s.confirmed={confirmed:true,side:'SHORT',entry:.94,stop:.96,tp1:.90,tp2:.88,tp3:.86};
 const m=card.cardMeta(s);
 assert.equal(m.headline,'CONFIRMED SHORT');
 assert.equal(m.levels.tp3,.86);
});
test('unusable data fails closed',()=>{
 assert.throws(()=>card.cardMeta({candles:[]}));
 assert.equal(card.formatPrice(NaN),'—');
});

test('reject invalid OHLC and out-of-order dates instead of drawing fabricated charts',()=>{
 const bad=snapshot();bad.candles[4].h=.90;
 assert.throws(()=>card.cardMeta(bad),/Invalid market candle/);
 const reversed=snapshot();reversed.candles[3].t=reversed.candles[2].t;
 assert.throws(()=>card.cardMeta(reversed),/timestamps not in order/);
});
test('drawing model computes prices and valid scale from actual candles',()=>{
 const model=card.drawingModel(snapshot(),{supportResistance:()=>({support:.91,resistance:.96})});
 assert.equal(model.data.length,40);
 assert.equal(model.ema9.length,40);
 assert.equal(model.price,.94);
 assert.ok(model.low<.91 && model.high>.95);
 assert.equal(model.levels.length,2);
 assert.equal(model.levels[0].name,'S');
});
test('rendering creates a complete landscape PNG layout without depending on screenshots',()=>{
 const drawn=[];
 const ctx={
  fillRect:(...args)=>drawn.push(['rect',...args]),
  strokeRect:()=>{},beginPath:()=>{},moveTo:()=>{},lineTo:()=>{},
  stroke:()=>{},fillText:(...args)=>drawn.push(['text',...args]),
  setLineDash:()=>{}
 };
 const oldDocument=global.document;
 global.document={createElement:tag=>{assert.equal(tag,'canvas');return {
   width:0,height:0,getContext:()=>ctx};}};
 try{
  const canvas=card.drawShareCard(snapshot(),null,{supportResistance:()=>({support:.91,resistance:.96})});
  assert.equal(canvas.width,1400);
  assert.equal(canvas.height,900);
  assert.ok(drawn.some(x=>x[0]==='text'&&String(x[1]).includes('WAIT')));
  assert.ok(drawn.some(x=>x[0]==='text'&&x[1]==='No financial advice.'));
  assert.ok(drawn.some(x=>x[0]==='text'&&String(x[1])==='SUPPORT'));
 }finally{global.document=oldDocument;}
});
