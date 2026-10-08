import { METHODS, CLASSIC_THRESHOLD, randomStream, sampleChord, probability, cutoff, qualifies, wilsonInterval, radialCDF } from '../lib/bertrand.mjs';

type Chord = ReturnType<typeof sampleChord>;
const root = document.querySelector<HTMLElement>('#bertrand')!;
const find = <T extends Element = HTMLElement>(selector:string) => root.querySelector<T>(selector)!;
const run=find<HTMLButtonElement>('#run'), step=find<HTMLButtonElement>('#step'), batch=find<HTMLButtonElement>('#batch');
const view=find<HTMLSelectElement>('#view'), thresholdInput=find<HTMLInputElement>('#threshold');
const LIMIT=100000, RATE=180, SEEDS=[1897,3307,7411];
let threshold=CLASSIC_THRESHOLD, running=false, timer=0;
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
const experiments=METHODS.map((method:string,i:number)=>({method,random:randomStream(SEEDS[i]),chords:[] as Chord[],successes:0,bins:new Array<number>(16).fill(0),panel:find<HTMLElement>(`[data-method="${method}"]`)}));
const pct=(n:number)=>(100*n).toFixed(1)+'%';
const number=(n:number)=>n.toLocaleString('en-GB');
const isClassic=()=>Math.abs(threshold-CLASSIC_THRESHOLD)<1e-10;
// Keep every mark, but rasterise only new samples between view changes.
// Rebuild from the complete sample when scale, threshold or view changes.
const layers=new WeakMap<HTMLCanvasElement,{canvas:HTMLCanvasElement,key:string,count:number}>();

function append(count:number) {
  for(const e of experiments) {
    for(let j=0;j<count && e.chords.length<LIMIT;j++) {
      const chord=sampleChord(e.method,e.random);
      e.chords.push(chord); e.successes+=Number(qualifies(chord,threshold));
      e.bins[Math.min(15,Math.floor(chord.distance*16))]++;
    }
  }
  if(experiments[0].chords.length>=LIMIT) pause();
  render();
}
function announce(prefix:string) {
  find('#announcement').textContent=`${prefix} ${number(experiments[0].chords.length)} samples per method. `+experiments.map(e=>`${e.method}: ${e.chords.length ? pct(e.successes/e.chords.length)+' longer than the threshold' : 'no samples yet'}.`).join(' ');
}
function pause() { running=false; window.clearInterval(timer); run.textContent='Draw chords'; }
function start() {
  if(running) { pause(); announce('Paused.'); return; }
  if(experiments[0].chords.length>=LIMIT) return;
  running=true; run.textContent='Pause';
  // Sampling is a visible demonstration. Pause in hidden tabs; no elapsed-time catch-up.
  timer=window.setInterval(()=>append(reducedMotion.matches ? RATE : RATE/10),reducedMotion.matches ? 1000 : 100);
  announce('Sampling started.');
}
function renderCircle(e:typeof experiments[number]) {
  const canvas=e.panel.querySelector<HTMLCanvasElement>('canvas')!;
  const size=canvas.getBoundingClientRect().width;
  if(!size) return;
  const dpr=Math.min(window.devicePixelRatio||1,3);
  const pixels=Math.round(size*dpr);
  if(canvas.width!==pixels || canvas.height!==pixels) { canvas.width=pixels; canvas.height=pixels; }
  const main=canvas.getContext('2d')!;
  let c=main;
  c.setTransform(dpr,0,0,dpr,0,0); c.clearRect(0,0,size,size);
  const center=size/2, radius=size*.443, mode=view.value;
  const pos=(x:number,y:number)=>[center+x*radius,center-y*radius];
  function line(ax:number,ay:number,bx:number,by:number,color:string,width=1,dash:number[]=[]) {
    c.beginPath(); c.setLineDash(dash); c.strokeStyle=color; c.lineWidth=width;
    c.moveTo(...pos(ax,ay) as [number,number]); c.lineTo(...pos(bx,by) as [number,number]); c.stroke(); c.setLineDash([]);
  }
  function circle(x:number,y:number,r:number,color:string,fill=false,width=1,dash:number[]=[]) {
    c.beginPath(); c.setLineDash(dash); c.strokeStyle=color; c.fillStyle=color; c.lineWidth=width;
    c.arc(...pos(x,y) as [number,number],r,0,Math.PI*2); fill?c.fill():c.stroke(); c.setLineDash([]);
  }
  const q=cutoff(threshold), latest=e.chords.at(-1);
  if(mode==='midpoints' || mode==='chords' || mode==='lengths') {
    let layer=layers.get(canvas);
    if(!layer) {
      layer={canvas:document.createElement('canvas'),key:'',count:0};
      layers.set(canvas,layer);
    }
    // Only the colour-classified view depends on the threshold.
    const key=`${size}:${dpr}:${mode}:${mode==='lengths'?threshold:''}`;
    if(layer.key!==key || layer.count>e.chords.length) {
      layer.canvas.width=pixels;layer.canvas.height=pixels;
      layer.key=key;layer.count=0;
    }
    c=layer.canvas.getContext('2d')!;
    c.setTransform(dpr,0,0,dpr,0,0);
    for(let i=layer.count;i<e.chords.length;i++) {
      const ch=e.chords[i];
      if(mode==='midpoints') {
        circle(ch.x,ch.y,1.7,'rgba(35,110,112,.55)',true);
      } else {
        const color=mode==='lengths' && !qualifies(ch,threshold)?'rgba(163,106,56,.17)':'rgba(35,110,112,.17)';
        line(ch.ax,ch.ay,ch.bx,ch.by,color,.85);
      }
    }
    layer.count=e.chords.length;
    c=main;c.drawImage(layer.canvas,0,0,size,size);
  }
  // The fixed triangle is a length reference, never a test of chord orientation.
  if(isClassic()) {
    const vertices=[Math.PI/2,Math.PI/2+2*Math.PI/3,Math.PI/2+4*Math.PI/3];
    for(let j=0;j<3;j++) line(Math.cos(vertices[j]),Math.sin(vertices[j]),Math.cos(vertices[(j+1)%3]),Math.sin(vertices[(j+1)%3]),'rgba(50,61,55,.3)',1);
  }
  circle(0,0,radius,'#616c67',false,1.05);
  if(q>0 && q<1) circle(0,0,radius*q,'rgba(35,88,86,.65)',false,1,[3,4]);
  circle(0,0,1.5,'#5b6561',true);
  if(latest) {
    const color=mode==='lengths' && !qualifies(latest,threshold)?'#a36a38':'#236e70';
    if(mode==='construction') {
      if(e.method!=='endpoints') {
        const x=Math.cos(latest.angle), y=Math.sin(latest.angle);
        line(0,0,x,y,'#8d9992',1,[3,4]);
        line(0,0,latest.x,latest.y,'#65786e',1.5);
        // Right-angle marker in unit coordinates.
        const nx=x*.06, ny=y*.06, tx=-y*.06, ty=x*.06;
        line(latest.x-nx,latest.y-ny,latest.x-nx+tx,latest.y-ny+ty,'#86958d');
        line(latest.x-nx+tx,latest.y-ny+ty,latest.x+tx,latest.y+ty,'#86958d');
      }
      if(e.method==='endpoints') {
        circle(latest.ax,latest.ay,5,'#fff',true);circle(latest.bx,latest.by,5,'#fff',true);
        circle(latest.ax,latest.ay,5,color);circle(latest.bx,latest.by,5,color);
      }
    }
    line(latest.ax,latest.ay,latest.bx,latest.by,color,mode==='construction'?2:1.7);
    circle(latest.x,latest.y,3.4,'#fff',true);
    circle(latest.x,latest.y,3.4,color,true,1.3);
    if(mode==='construction') {
      c.font='14px system-ui'; c.fillStyle='#36443d';
      const [mx,my]=pos(latest.x,latest.y);
      c.fillText('M',Math.min(size-18,Math.max(6,mx+9)),Math.min(size-8,Math.max(16,my-8)));
    }
  }
}
function histogram(e:typeof experiments[number]) {
  const svg=find<SVGSVGElement>(`.histogram[data-method="${e.method}"]`);
  const w=svg.getBoundingClientRect().width;
  if(!w) return;
  const h=160,left=32,right=10,top=12,bottom=34,pw=w-left-right,ph=h-top-bottom;
  svg.setAttribute('viewBox',`0 0 ${w} ${h}`);
  const maximum=Math.max(.25,...experiments.flatMap(ex=>ex.bins.map(n=>Math.ceil(n/Math.max(1,ex.chords.length)*20)/20)));
  const y=(v:number)=>top+ph*(1-v/maximum);
  let html=`<title>${e.method}: midpoint distance distribution</title><desc>Bars are simulated bin frequencies, horizontal ticks are exact bin probabilities. The vertical scale is 0 to ${100*maximum} percent per bin.</desc>`;
  for(const t of [0,maximum/2,maximum]) html+=`<line x1="${left}" x2="${w-right}" y1="${y(t)}" y2="${y(t)}" stroke="#e1e5e2"/><text x="${left-5}" y="${y(t)+4}" text-anchor="end" font-size="11" fill="#626763">${Number((t*100).toFixed(1))}%</text>`;
  for(let i=0;i<16;i++) {
    const empirical=e.bins[i]/Math.max(1,e.chords.length), exact=radialCDF(e.method,(i+1)/16)-radialCDF(e.method,i/16),x=left+i*pw/16;
    html+=`<rect x="${x+1}" y="${y(empirical)}" width="${Math.max(1,pw/16-2)}" height="${ph*empirical/maximum}" fill="#b6cecd"><title>Distance ${i/16}–${(i+1)/16} R: ${e.chords.length ? 'sample '+pct(empirical) : 'no samples yet'}, exact ${pct(exact)}</title></rect><line x1="${x+1}" x2="${x+pw/16-1}" y1="${y(exact)}" y2="${y(exact)}" stroke="#343e3d" stroke-width="1.4"/>`;
  }
  const xq=left+cutoff(threshold)*pw;
  html+=`<line x1="${xq}" x2="${xq}" y1="${top}" y2="${top+ph}" stroke="#236e70" stroke-dasharray="3 3"/>`;
  for(const t of [0,.5,1]) html+=`<text x="${left+t*pw}" y="${h-15}" text-anchor="middle" font-size="12" fill="#626763">${t}</text>`;
  svg.innerHTML=html;
}
function render() {
  const n=experiments[0].chords.length;
  root.dataset.view=view.value;
  find<HTMLElement>('.diagram-key').hidden=view.value!=='lengths';
  for(const [i,e] of experiments.entries()) {
    const exact=probability(e.method,threshold), estimate=n ? e.successes/n : 0, [lo,hi]=wilsonInterval(e.successes,n);
    const el=e.panel.querySelector<HTMLElement>('.exact-value')!;
    el.textContent=isClassic()?['⅓','½','¼'][i]:pct(exact);
    e.panel.querySelector('.sample-value')!.textContent=n ? pct(estimate) : '—';
    e.panel.querySelector<HTMLElement>('.estimate-fill')!.style.width=`${estimate*100}%`;
    const interval=e.panel.querySelector<HTMLElement>('.interval')!;interval.hidden=!n;interval.style.left=`${lo*100}%`;interval.style.width=`${(hi-lo)*100}%`;
    e.panel.querySelector<HTMLElement>('.exact-mark')!.style.left=`${exact*100}%`;
    e.panel.querySelector('.estimate-line')!.setAttribute('aria-label',n ? `Sample ${pct(estimate)}, exact ${pct(exact)}, 95% Wilson interval ${pct(lo)} to ${pct(hi)}.` : `No samples yet. Exact probability ${pct(exact)}.`);
    renderCircle(e);
    if(find<HTMLDetailsElement>('#explore').open) histogram(e);
  }
  const ordinary=isClassic()?'The dashed circle has radius R/2. A chord is longer than √3 R exactly when its midpoint lies inside it.':`A chord is longer than ${threshold.toFixed(3)} R exactly when its midpoint is closer than ${cutoff(threshold).toFixed(3)} R to the centre.`;
  find('#view-caption').textContent=ordinary;
  run.disabled=step.disabled=batch.disabled=n>=LIMIT;
  if(n>=LIMIT) run.textContent='Sample limit reached';
}
function setThreshold(value:number) {
  threshold=value;
  find('#threshold-value').textContent=isClassic()?'√3 R':threshold.toFixed(3)+' R';
  thresholdInput.value=String(threshold);
  thresholdInput.setAttribute('aria-valuetext',isClassic()?'Square root of three times the radius':`${threshold.toFixed(3)} times the radius`);
  for(const e of experiments) e.successes=e.chords.reduce((sum,ch)=>sum+Number(qualifies(ch,threshold)),0);
  render();
}
function reset() {
  pause();threshold=CLASSIC_THRESHOLD;view.value='chords';
  experiments.forEach((e,i)=>{e.random=randomStream(SEEDS[i]);e.chords=[];e.successes=0;e.bins.fill(0);});
  setThreshold(CLASSIC_THRESHOLD);
}
run.addEventListener('click',start);
step.addEventListener('click',()=>{pause();append(1);announce('One draw added.');});
batch.addEventListener('click',()=>{pause();append(1000);announce('Batch added.');});
find('#reset').addEventListener('click',()=>{reset();announce('Reset.');});
view.addEventListener('change',()=>{if(view.value==='construction') pause();render();announce(`Showing ${view.options[view.selectedIndex].text}.`);});
thresholdInput.addEventListener('input',()=>setThreshold(Number(thresholdInput.value)));
thresholdInput.addEventListener('change',()=>announce('Threshold changed.'));
find('#classic').addEventListener('click',()=>{setThreshold(CLASSIC_THRESHOLD);announce('Triangle threshold restored.');});
find('#explore').addEventListener('toggle',render);
document.addEventListener('visibilitychange',()=>{if(document.hidden && running) pause();});
reducedMotion.addEventListener('change',()=>{if(running) pause();});
new ResizeObserver(()=>render()).observe(root);
reset();
