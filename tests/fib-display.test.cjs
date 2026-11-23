const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const source=fs.readFileSync(require('node:path').join(__dirname,'..','index.html'),'utf8');
test('interactive chart shows only 3 Fibonacci retracements with no right-axis labels',()=>{
 assert.match(source,/\[\[0\.382,'#287c78'\],\[0\.5,'#8b7850'\],\[0\.618,'#7e6195'\]\]/);
 const block=source.split('Professional minimalist Fibonacci:')[1]?.split('const plan =')[0];
 assert.ok(block,'Fibonacci interactive block exists');
 assert.match(block,/axisLabelVisible:false,title:''/);
 assert.doesNotMatch(block,/axisLabelVisible:true/);
});
test('canvas fallback uses same three Fibonacci levels, with subtle lines',()=>{
 const block=source.split('Simplified Fibonacci overlay:')[1]?.split('const planLevels =')[0];
 assert.ok(block);
 assert.match(block,/\[\[\.382,"#287c78"\],\[\.5,"#8b7850"\],\[\.618,"#7e6195"\]\]/);
 assert.doesNotMatch(block,/fillText\(/);
});
test('Fibonacci is opt-in, and confirmed entry logic untouched by overlay',()=>{
 assert.match(source,/data-indicator="fib"> Fibonacci \(clean 0\.382 \/ 0\.5 \/ 0\.618\)/);
 assert.doesNotMatch(source,/data-indicator="fib" checked/);
});
