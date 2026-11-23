const test=require('node:test');
const assert=require('node:assert/strict');
const extras=require('../chart-extras.js');
const bar=(i,c)=>({t:Date.UTC(2026,10,23,0,i*15),o:c,c,h:c+1,l:c-1,v:100});
test('bull/bear crosses are labeled preliminary',()=>{
 const up=Array.from({length:34},(_,i)=>bar(i,120-i));
 const bars=[...up,...Array.from({length:16},(_,i)=>bar(i+34,86+i*3))];
 const marks=extras.crossMarkers(bars);
 assert.ok(marks.some(x=>x.shape==='arrowUp'&&x.color==='#21d6a5'));
 assert.ok(marks.length<=2);
 assert.ok(marks.every(x=>!Object.hasOwn(x,'text')));
 assert.ok(marks.every(x=>x.position==='belowBar'||x.position==='aboveBar'));
});
test('no more than two arrows, even with repeated oscillating crosses',()=>{
 const values=Array.from({length:120},(_,i)=>100+Math.sin(i*.8)*15);
 const marks=extras.crossMarkers(values.map((v,i)=>bar(i,v)),7);
 assert.ok(marks.length<=2);
 assert.ok(marks.every(m=>!m.text));
});
test('no markers for flat or insufficient candles',()=>{
 assert.deepEqual(extras.crossMarkers(Array.from({length:50},(_,i)=>bar(i,100))),[]);
 assert.deepEqual(extras.crossMarkers([bar(0,100)]),[]);
});
test('confirmed takes precedence; early means not confirmed',()=>{
 assert.equal(extras.signalStatus({aligned:true,vr:2}, {confirmed:true,side:'SHORT'}).label,'CONFIRMED SHORT');
 assert.equal(extras.signalStatus({aligned:true,vr:1.7}, {confirmed:false}).kind,'early');
 assert.equal(extras.signalStatus({aligned:false,vr:3}, null).kind,'wait');
});
test('countdown is on candle close boundary',()=>{
 const t=Date.UTC(2026,10,23,10,7,30);
 assert.equal(extras.candleCountdown('15m',t).label,'00:07:30');
 assert.equal(extras.candleCountdown('1h',t).label,'00:52:30');
 assert.equal(extras.candleCountdown('unknown',t),null);
});
