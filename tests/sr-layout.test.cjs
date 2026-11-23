const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
test('support/resistance is presented outside the candle area as header prices',()=>{
 assert.match(source,/id="chartSRInfo"/);
 assert.match(source,/SUPPORT '\+format\(sr\.support\)/);
 assert.match(source,/RESISTANCE '\+format\(sr\.resistance\)/);
});
test('interactive chart hides axis price badges and renders compact left labels',()=>{
 const block=source.split('// Left-edge compact badges')[1]?.split('const swingBars =')[0];
 assert.ok(block);
 assert.match(block,/axisLabelVisible:false,title:''/);
 assert.match(block,/host\.appendChild\(label\)/);
 assert.match(block,/label\.textContent=level\.name/);
 assert.match(block,/if\(level\.y-lastY<24\)continue/);
 assert.doesNotMatch(block,/axisLabelVisible:true/);
});
test('fallback canvas labels are small and on left, not price scale',()=>{
 const section=source.split("if(shown('sr')&&window.PrimeChartExtras)")[1]?.split("if(shown('fib'))")[0];
 assert.ok(section);
 assert.match(section,/context\.fillText\(label,padding\.l\+6,cy\+4\)/);
 assert.doesNotMatch(section,/context\.fillText\(label,width-padding\.r/);
});
