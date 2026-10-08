import test from 'node:test';
import assert from 'node:assert/strict';
import {METHODS,CLASSIC_THRESHOLD,randomStream,sampleChord,fromMidpoint,probability,radialCDF,qualifies,wilsonInterval} from '../src/lib/bertrand.mjs';

test('classic exact probabilities and endpoint thresholds',()=>{
  for(const [i,method] of METHODS.entries()) {
    assert.ok(Math.abs(probability(method,CLASSIC_THRESHOLD)-[1/3,1/2,1/4][i])<1e-14);
    assert.equal(probability(method,0),1);
    assert.equal(probability(method,2),0);
  }
  assert.equal(qualifies(fromMidpoint(0,0),2),false,'strictly longer excludes equality');
  assert.equal(qualifies(fromMidpoint(1,0),0),false);
});
for(const [i,method] of METHODS.entries()) {
  test(`${method}: endpoints, midpoint, perpendicularity and chord length agree`,()=>{
    const rng=randomStream(9+i);
    for(let n=0;n<2000;n++) {
      const c=sampleChord(method,rng);
      assert.ok(Math.abs(Math.hypot(c.ax,c.ay)-1)<1e-12);
      assert.ok(Math.abs(Math.hypot(c.bx,c.by)-1)<1e-12);
      assert.ok(Math.abs((c.ax+c.bx)/2-c.x)<1e-12);
      assert.ok(Math.abs((c.ay+c.by)/2-c.y)<1e-12);
      assert.ok(Math.abs(c.x*(c.ax-c.bx)+c.y*(c.ay-c.by))<1e-12);
      assert.ok(Math.abs(c.length*c.length+4*c.distance*c.distance-4)<1e-12);
      assert.equal(qualifies(c,CLASSIC_THRESHOLD),c.distance<.5);
    }
  });
  test(`${method}: simulated survival probabilities and radial distribution match theory`,()=>{
    const rng=randomStream(5023+i),n=80000;
    const thresholds=[0,.5,1,CLASSIC_THRESHOLD,1.95,2];
    const counts=thresholds.map(()=>0),radial=[0,0];
    let x=0,y=0;
    for(let j=0;j<n;j++) {
      const c=sampleChord(method,rng);
      thresholds.forEach((t,k)=>counts[k]+=Number(qualifies(c,t)));
      radial[0]+=Number(c.distance<.5);radial[1]+=Number(c.distance<.8);
      x+=c.x;y+=c.y;
    }
    thresholds.forEach((t,k)=>assert.ok(Math.abs(counts[k]/n-probability(method,t))<.008));
    [.5,.8].forEach((d,k)=>assert.ok(Math.abs(radial[k]/n-radialCDF(method,d))<.008));
    assert.ok(Math.abs(x/n)<.008 && Math.abs(y/n)<.008,'no preferred direction');
    let sum=0;for(let bin=0;bin<16;bin++)sum+=radialCDF(method,(bin+1)/16)-radialCDF(method,bin/16);
    assert.ok(Math.abs(sum-1)<1e-14,'exact histogram probabilities normalise');
  });
}
test('seed reset reproduces every draw and separate streams differ',()=>{
  const a=randomStream(7),b=randomStream(7),c=randomStream(8);
  for(let i=0;i<100;i++)assert.deepEqual(sampleChord('radius',a),sampleChord('radius',b));
  assert.notDeepEqual(sampleChord('radius',a),sampleChord('radius',c));
});
test('Wilson intervals remain valid for zero and all successes',()=>{
  for(const successes of [0,25,50,100]) {
    const [lo,hi]=wilsonInterval(successes,100);
    assert.ok(lo>=0 && hi<=1 && lo<=successes/100 && hi>=successes/100);
  }
  const [lo,hi]=wilsonInterval(50,100);
  assert.ok(Math.abs(lo-.4038315)<1e-6 && Math.abs(hi-.5961685)<1e-6);
});
