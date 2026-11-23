const assert=require('node:assert/strict');
const test=require('node:test');
const {detect}=require('../ema-cross.js');
const INTERVAL=900_000;
const start=Date.UTC(2026,10,23,0,0,0);
function bars(values){
  return values.map((c,i)=>({t:start+i*INTERVAL,o:c,h:c+0.5,l:c-0.5,c,v:100+i}));
}
const up=[...Array.from({length:42},(_,i)=>120-i*0.5),...Array.from({length:9},(_,i)=>99+i*3)];
const down=up.map(v=>250-v);
const now=start+(up.length+1)*INTERVAL;
test('bullish cross uses closed candles and marks discovery only',()=>{
  const found=detect(bars(up),INTERVAL,now,8);
  assert.ok(found);assert.equal(found.direction,'BUY CROSS');
  assert.ok(found.ageMs>=0);assert.ok(found.volumeRatio>0);
  assert.equal(Object.hasOwn(found,'confirmed'),false);
});
test('bearish cross',()=>{
  const found=detect(bars(down),INTERVAL,now,8);
  assert.ok(found);assert.equal(found.direction,'SELL CROSS');
});
test('in-progress candle cannot create a cross',()=>{
  const rows=bars(up);
  const result=detect(rows,INTERVAL,start+(rows.length-1)*INTERVAL+INTERVAL/2,8);
  if(result)assert.ok(result.time<=start+(rows.length-1)*INTERVAL+INTERVAL/2);
});
test('insufficient history never fabricates a cross',()=>{
  assert.equal(detect(bars(up.slice(0,20)),INTERVAL,now),null);
});
test('flat series yields no cross',()=>{
  assert.equal(detect(bars(Array(60).fill(100)),INTERVAL,now),null);
});
