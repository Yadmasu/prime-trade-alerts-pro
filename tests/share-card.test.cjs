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
