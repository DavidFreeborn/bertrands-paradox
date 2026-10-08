/** Unit-circle geometry. Sampling is separate from rendering and experiment state. */
export const METHODS = ['endpoints', 'radius', 'midpoint'];
export const CLASSIC_THRESHOLD = Math.sqrt(3);
export function randomStream(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function fromMidpoint(distance, angle) {
  const x = distance * Math.cos(angle), y = distance * Math.sin(angle);
  const half = Math.sqrt(Math.max(0, 1 - distance * distance));
  const dx = -Math.sin(angle) * half, dy = Math.cos(angle) * half;
  return { ax:x+dx, ay:y+dy, bx:x-dx, by:y-dy, x, y, distance, length:2*half, angle };
}
export function sampleChord(method, random) {
  if (method === 'endpoints') {
    const a = random()*2*Math.PI, b = random()*2*Math.PI;
    const ax=Math.cos(a), ay=Math.sin(a), bx=Math.cos(b), by=Math.sin(b);
    const x=(ax+bx)/2, y=(ay+by)/2;
    return {ax,ay,bx,by,x,y,distance:Math.hypot(x,y),length:Math.hypot(ax-bx,ay-by),angle:Math.atan2(y,x)};
  }
  const angle = random()*2*Math.PI, u = random();
  if (!METHODS.includes(method)) throw new Error('Unknown sampling method');
  return fromMidpoint(method === 'radius' ? u : Math.sqrt(u), angle);
}
export function cutoff(threshold) {
  return Math.sqrt(Math.max(0, 1 - (Math.max(0,Math.min(2,threshold))/2)**2));
}
export function probability(method, threshold) {
  const d = cutoff(threshold);
  if (method === 'endpoints') return 2*Math.asin(d)/Math.PI;
  if (method === 'radius') return d;
  if (method === 'midpoint') return d*d;
  throw new Error('Unknown sampling method');
}
export function radialCDF(method, distance) {
  const d=Math.max(0,Math.min(1,distance));
  return method==='endpoints' ? 2*Math.asin(d)/Math.PI : method==='radius' ? d : d*d;
}
export function qualifies(chord, threshold) { return chord.length > threshold; }
export function wilsonInterval(successes, count) {
  if (!count) return [0,1];
  const z=1.959963984540054, p=successes/count, a=z*z/count;
  const center=(p+a/2)/(1+a), half=z*Math.sqrt(p*(1-p)/count+a/(4*count))/(1+a);
  return [successes===0 ? 0 : Math.max(0,center-half),successes===count ? 1 : Math.min(1,center+half)];
}
