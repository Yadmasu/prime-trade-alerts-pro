// Offline experimental replay only. No live integration, credentials or network calls.
// Input: ordered closed 15m candle objects {t: UNIX seconds,o,h,l,c}.
// Completed hourly EMA9/21 bias; 12-bar sweep, break, 0.382–0.618 retest, next break.
// One position; 2R target, stop-first ambiguity, 24h timeout, 0.1% cost per side.
// No funding, liquidity, spread, gap-slippage or out-of-sample validation.
function replay(rows){
  const result={trades:0,wins:0,losses:0,netR:0,drawdownR:0,open:0,gaps:0};
  let ema9=null,ema21=null,hour=[],bias=0,setup=null,pos=null,peak=0;
  for(let i=0;i<rows.length;i++){
    const b=rows[i], prev=rows[i-1];
    if(prev&&b.t-prev.t!==900){result.gaps++;setup=null;hour=[];ema9=null;ema21=null;bias=0;if(pos){result.open++;pos=null;}}
    if(b.t%3600===0)hour=[];
    if(pos){
      const stop=pos.side===1?b.l<=pos.stop:b.h>=pos.stop;
      const target=pos.side===1?b.h>=pos.target:b.l<=pos.target;
      if(stop||target||i-pos.i>=96){
        const exit=stop?pos.stop:target?pos.target:b.c;
        const r=(pos.side*(exit-pos.entry)-0.001*(pos.entry+exit))/pos.risk;
        result.trades++;result.wins+=r>0?1:0;result.losses+=r<=0?1:0;result.netR+=r;peak=Math.max(peak,result.netR);result.drawdownR=Math.max(result.drawdownR,peak-result.netR);pos=null;
      }
    }
    if(i>=48&&!pos){
      const prior=rows.slice(i-12,i);
      if(prior.every((v,j)=>j===0||v.t-prior[j-1].t===900)&&prev&&b.t-prev.t===900){
        const hi=Math.max(...prior.map(x=>x.h)),lo=Math.min(...prior.map(x=>x.l));
        if(setup&&(i-setup.i>24||bias!==setup.side||(setup.side===1?b.l<setup.sweep:b.h>setup.sweep)))setup=null;
        if(setup){
          const s=setup,d=s.side;
          if(s.phase===0){
            if(d===1?b.c>s.breakLevel:b.c<s.breakLevel){s.extreme=d===1?b.h:b.l;s.phase=1;}
          }else if(s.phase===1){
            const dist=Math.abs(s.extreme-s.sweep),a=s.extreme-d*.382*dist,z=s.extreme-d*.618*dist;
            if(b.l<=Math.max(a,z)&&b.h>=Math.min(a,z)&&d*(b.c-b.o)>0&&d*(b.c-z)>0){s.phase=2;s.trigger=d===1?b.h:b.l;}
            else if(d===1?b.h>s.extreme:b.l<s.extreme)s.extreme=d===1?b.h:b.l;
          }else if(d*(b.c-s.trigger)>0&&d*(b.c-b.o)>0){
            const entry=b.c,stop=s.sweep-d*entry*.001,risk=Math.abs(entry-stop);
            if(risk/entry>=.005&&risk/entry<=.03){pos={side:d,entry,stop,risk,target:entry+d*2*risk,i};}
            setup=null;
          }
        }
        if(!setup&&!pos){
          if(bias===1&&b.l<lo&&b.c>lo)setup={side:1,i,sweep:b.l,breakLevel:hi,phase:0};
          if(bias===-1&&b.h>hi&&b.c<hi)setup={side:-1,i,sweep:b.h,breakLevel:lo,phase:0};
        }
      }
    }
    hour.push(b);
    if(b.t%3600===2700&&hour.length===4&&hour[0].t===b.t-2700){
      const c=b.c;ema9=ema9===null?c:ema9+.2*(c-ema9);ema21=ema21===null?c:ema21+2/22*(c-ema21);
      bias=c>ema9&&ema9>ema21?1:c<ema9&&ema9<ema21?-1:0;
    }
  }
  if(pos)result.open++;
  return result;
}
export { replay };

/* 2026-11-25 exploratory replay, 90-day requested window, Hyperliquid candle source via Syndicate:
[
  {
    "coin": "BTC",
    "bars": 4976,
    "first": 1791086400,
    "last": 1795563900,
    "failedChunks": 0,
    "trades": 7,
    "wins": 1,
    "losses": 6,
    "netR": -5.146230827431677,
    "drawdownR": 5.146230827431677,
    "open": 1,
    "gaps": 0
  },
  {
    "coin": "ETH",
    "bars": 4976,
    "first": 1791086400,
    "last": 1795563900,
    "failedChunks": 0,
    "trades": 9,
    "wins": 5,
    "losses": 4,
    "netR": -1.030122291519502,
    "drawdownR": 4.180944163565139,
    "open": 0,
    "gaps": 0
  },
  {
    "coin": "SOL",
    "bars": 4975,
    "first": 1791087300,
    "last": 1795563900,
    "failedChunks": 0,
    "trades": 8,
    "wins": 4,
    "losses": 4,
    "netR": 1.355975724948773,
    "drawdownR": 1.7527278651622582,
    "open": 0,
    "gaps": 0
  }
]
*/
