"use strict";
const byId = id => document.getElementById(id);
const colors = {blue:"#83b4ef", teal:"#63cbb0", red:"#f08088", purple:"#b79be9", orange:"#e5a569", muted:"#a7b4c5"};
const period=900000;
function requireValue(test){if(!test) throw Error("The received signal and its market history could not be verified.");}
function digestBytes(rows){
  const buffer=new ArrayBuffer(rows.length*48), view=new DataView(buffer);
  rows.forEach((r,i)=>["t","o","h","l","c","v"].forEach((k,j)=>view.setFloat64((i*6+j)*8,r[k],false)));
  return buffer;
}
function draw(s,rows){
  const priceText=p=>p.toFixed(Math.max(0,Math.min(6-(s.size_decimals??0),4-Math.floor(Math.log10(p)))));
  const pivots=PrimeChartExtras.supportResistance(rows);
  byId("pivots").textContent=["support","resistance"].map(name=>
    name.toUpperCase()+" "+(Number.isFinite(pivots[name])?priceText(pivots[name]):"—")).join("   ·   ");
  const names=["ENTRY","SL","TP1","TP2","TP3"], levels=[s.entry,s.stop,s.tp1,s.tp2,s.tp3];
  requireValue(levels.every(x=>Number.isFinite(x)&&x>0));
  const ordered=[s.stop,s.entry,s.tp1,s.tp2,s.tp3]; if(s.side==="SHORT")ordered.reverse();
  requireValue(["LONG","SHORT"].includes(s.side)&&ordered.every((p,i)=>!i||p>ordered[i-1]));
  let fast=rows[0].c,slow=fast,vol=0,weighted=0;
  for(const r of rows){
    fast+=(r.c-fast)*2/10;slow+=(r.c-slow)*2/22;r.fast=fast;r.slow=slow;
    if(r.t>=s.anchor){vol+=r.v;weighted+=(r.h+r.l+r.c)/3*r.v;if(vol)r.avwap=weighted/vol;}
  }
  const last=rows.at(-1), opening=rows.filter(r=>r.t>=s.anchor&&r.t<s.anchor+2*period);
  requireValue(last.c===s.entry && Math.abs(last.avwap-s.anchored_vwap)<=Math.abs(s.anchored_vwap)*1e-9 &&
    opening.length===2 && Math.max(...opening.map(r=>r.h))===s.orh && Math.min(...opening.map(r=>r.l))===s.orl);
  const bars=rows.slice(-48), svg=byId("plot"), compact=window.innerWidth<600;
  const W=compact?430:880,H=compact?400:425, left=5,right=compact?242:650, bottom=H-73, top=14;
  svg.setAttribute("viewBox",`0 0 ${W} ${H}`);svg.replaceChildren();
  function item(tag,attrs,text){
    const e=document.createElementNS("http://www.w3.org/2000/svg",tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));
    if(text!==undefined)e.textContent=text;svg.append(e);return e;
  }
  const line=(x1,y1,x2,y2,stroke,dash="")=>item("line",{x1,y1,x2,y2,stroke,"stroke-dasharray":dash});
  const prices=[...levels,s.orh,s.orl,...bars.flatMap(r=>[r.l,r.h,r.fast,r.slow,r.avwap].filter(Number.isFinite))];
  const lo=Math.min(...prices),hi=Math.max(...prices),span=hi-lo,pad=span*.09;
  const y=p=>bottom-(p-lo+pad)/(span+2*pad)*(bottom-top);
  const dx=(right-left)/bars.length,x=i=>left+(i+.5)*dx,maxV=Math.max(1,...bars.map(r=>r.v));
  bars.forEach((r,i)=>{
    const color=r.c>=r.o?colors.teal:colors.red;
    line(x(i),y(r.h),x(i),y(r.l),color);
    item("rect",{x:x(i)-.31*dx,y:Math.min(y(r.o),y(r.c)),width:.62*dx,height:Math.max(1,Math.abs(y(r.o)-y(r.c))),fill:color});
    const h=r.v/maxV*30;item("rect",{x:x(i)-.31*dx,y:H-27-h,width:.62*dx,height:h,fill:color,opacity:".65"});
  });
  for(const [k,c] of [["fast",colors.blue],["slow",colors.orange],["avwap",colors.purple]]){
    item("polyline",{points:bars.flatMap((r,i)=>Number.isFinite(r[k])?[`${x(i)},${y(r[k])}`]:[]).join(" "),fill:"none",stroke:c,"stroke-width":1.4});
  }
  const known=bars.findIndex(r=>r.t>=s.anchor+2*period);
  if(known>=0)for(const p of [s.orh,s.orl])line(x(known),y(p),right,y(p),colors.muted,"2 4");
  const labels=levels.map((p,i)=>({p,py:y(p),name:names[i],c:i===0?colors.blue:i===1?colors.red:colors.teal})).sort((a,b)=>a.py-b.py);
  labels.forEach((a,i)=>a.ty=Math.max(a.py,i?labels[i-1].ty+24:top));
  labels.at(-1).ty=Math.min(bottom,labels.at(-1).ty);
  for(let i=3;i>=0;i--)labels[i].ty=Math.min(labels[i].ty,labels[i+1].ty-24);
  for(const a of labels){
    line(left,a.py,right,a.py,a.c,"4 5");line(right,a.py,right+9,a.ty,a.c);
    const el=item("text",{x:right+13,y:a.ty+4,fill:a.c,"font-size":compact?13:15},a.name+" "+priceText(a.p));
    const avail=W-right-17;if(el.getComputedTextLength()>avail){el.setAttribute("textLength",avail);el.setAttribute("lengthAdjust","spacingAndGlyphs");}
  }
  for(const [i,align] of [[0,"start"],[Math.floor(bars.length/2),"middle"],[bars.length-1,"end"]]){
    item("text",{x:x(i),y:H-4,fill:colors.muted,"font-size":12,"text-anchor":align},new Date(bars[i].t).toISOString().slice(11,16));
  }
  byId("levels").replaceChildren();
  for(const [i,p] of levels.entries()){
    const dt=document.createElement("dt"),dd=document.createElement("dd");dt.textContent=names[i];dd.textContent=priceText(p);byId("levels").append(dt,dd);
  }
}
async function prepareSharing(signal){
  const svg=byId("plot").cloneNode(true);
  const {width,height}=svg.viewBox.baseVal;
  svg.setAttribute("width",width);
  svg.setAttribute("height",height);
  const image=new Image();
  const source=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)],{type:"image/svg+xml"}));
  const canvas=document.createElement("canvas");
  canvas.width=width*2;canvas.height=(height+140)*2;
  const ctx=canvas.getContext("2d");
  try{
    image.src=source;
    await image.decode();
    ctx.scale(2,2);
    ctx.fillStyle="#101722";ctx.fillRect(0,0,width,height+140);
    ctx.fillStyle="#edf1f5";ctx.font="bold 16px system-ui";
    ctx.fillText("PRIME TRADE ALERTS PRO",10,22);
    ctx.fillStyle=signal.side==="LONG"?colors.teal:colors.red;
    ctx.fillText(signal.market+" / 15m · CONFIRMED "+signal.side,10,47,width-20);
    ctx.fillStyle=colors.muted;ctx.font="13px system-ui";
    ctx.fillText(byId("pivots").textContent,10,69,width-20);
    ctx.fillText("EMA9 · EMA21 · AVWAP · ORH / ORL",10,89);
    ctx.drawImage(image,0,96,width,height);
    ctx.fillText(byId("time").textContent,10,height+124);
    ctx.textAlign="right";ctx.fillText("No financial advice.",width-10,height+124);
  }finally{URL.revokeObjectURL(source);}
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/png"));
  if(!blob)throw Error("PNG export unavailable.");
  const file=new File([blob],"PRIME-"+signal.market.replace(/[^a-z0-9_-]/gi,"_")+".png",{type:"image/png"});
  for(const button of document.querySelectorAll("[data-share]")){
    button.disabled=false;
    button.onclick=async()=>{
      const status=byId("shareStatus");
      try{
        if(navigator.canShare?.({files:[file]})&&navigator.share){
          status.textContent="Choose "+button.dataset.share+" in the share sheet.";
          await navigator.share({files:[file]});
        }else{
          const link=document.createElement("a");
          link.href=URL.createObjectURL(file);link.download=file.name;
          document.body.append(link);link.click();link.remove();
          setTimeout(()=>URL.revokeObjectURL(link.href),5000);
          status.textContent="Attach the downloaded PNG in "+button.dataset.share+".";
        }
      }catch(error){status.textContent=error.name==="AbortError"?"Sharing cancelled.":"Image sharing failed.";}
    };
  }
}
async function openSignal(){
  const id=new URLSearchParams(location.search).get("signal");requireValue(/^[a-f0-9]{32}$/.test(id||""));
  const key=new URL("signal-cache/"+id,location.href);
  const cache=await caches.open("prime-confirmed-v1"), receipt=await cache.match(key.href);
  if(!receipt)throw Error("This device has no saved push for this signal.");
  const s=await receipt.json();requireValue(s.chart_id===id && Number.isSafeInteger(s.candle)&&s.candle+period<=Date.now());
  const historyKey=new URL("signal-cache/"+id+"/candles",location.href);
  const saved=await cache.match(historyKey.href);
  let raw;
  if(saved){raw=await saved.json();}
  else{
    const response=await fetch("https://api.hyperliquid.xyz/info",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"candleSnapshot",req:{coin:s.market,interval:"15m",startTime:s.first,endTime:s.candle+period-1}})});
    if(!response.ok)throw Error("Market history is temporarily unavailable.");raw=await response.json();
  }
  requireValue(Array.isArray(raw));
  const rows=raw.filter(r=>r.t>=s.first&&r.t<=s.candle).sort((a,b)=>a.t-b.t).map(r=>{
    requireValue(r.s===s.market&&r.i==="15m"&&r.T===r.t+period-1);
    return Object.fromEntries(["t","o","h","l","c","v"].map(k=>[k,Number(r[k])]));
  });
  requireValue(rows.length>=21&&rows[0].t===s.first&&rows.at(-1).t===s.candle);
  requireValue(rows.every((r,i)=>Object.values(r).every(Number.isFinite)&&r.l>0&&r.l<=Math.min(r.o,r.c)&&r.h>=Math.max(r.o,r.c)&&r.v>=0&&(!i||r.t===rows[i-1].t+period)));
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",digestBytes(rows))),n=>n.toString(16).padStart(2,"0")).join("");
  requireValue(hash===s.history_hash);
  byId("market").textContent=s.market+"  /  15m";byId("side").textContent="CONFIRMED "+s.side;byId("side").className=s.side.toLowerCase();
  byId("time").textContent=new Date(s.candle+period).toISOString().replace("T"," ").slice(0,16)+" UTC";
  for(const [name,color] of [["EMA9",colors.blue],["EMA21",colors.orange],["AVWAP",colors.purple],["ORH / ORL",colors.muted]]){
    const label=document.createElement("span");label.textContent=name;label.style.color=color;byId("legend").append(label);
  }
  document.querySelector("main").hidden=false;
  draw(s,rows);byId("status").hidden=true;
  byId("exchange").href="https://app.hyperliquid.xyz/trade/"+encodeURIComponent(s.market);
  prepareSharing(s).catch(()=>{byId("shareStatus").textContent="Chart image export unavailable.";});
  if(!saved)await cache.put(historyKey.href,new Response(JSON.stringify(raw))).catch(()=>{});
  window.addEventListener("resize",()=>draw(s,rows));
}
openSignal().catch(e=>{document.querySelector("main").hidden=true;byId("status").hidden=false;byId("status").textContent=e.message;});
