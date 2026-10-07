import{describe,expect,it}from'vitest';import{normalizeTimeline,timeFactorAt}from'../timeline';import{VALUE_KEYS}from'../models';
describe('timeFactorAt',()=>{
  it('returns the exact anchor tables at 1/5/10 years',()=>{
    expect(timeFactorAt(1)).toEqual({stability:1.2,growth:.75,freedom:.8,money:1.15});
    expect(timeFactorAt(5)).toEqual({stability:1,growth:1,freedom:1,money:1});
    expect(timeFactorAt(10)).toEqual({stability:.8,growth:1.25,freedom:1.2,money:.85});
  });
  it('interpolates linearly between adjacent anchors',()=>{
    expect(timeFactorAt(3)).toEqual({stability:1.1,growth:.875,freedom:.9,money:1.075});
    const f7=timeFactorAt(7);
    expect(f7.stability).toBeCloseTo(.92);expect(f7.growth).toBeCloseTo(1.1);expect(f7.freedom).toBeCloseTo(1.08);expect(f7.money).toBeCloseTo(.94);
  });
  it('never overshoots the enclosing anchors',()=>{
    for(const y of[2,3,4,6,7,8,9])for(const k of VALUE_KEYS){const f=timeFactorAt(y)[k];const[lo,hi]=y<5?[1,5]:[5,10];const a=timeFactorAt(lo)[k],b=timeFactorAt(hi)[k];expect(f).toBeGreaterThanOrEqual(Math.min(a,b));expect(f).toBeLessThanOrEqual(Math.max(a,b))}
  });
  it('clamps out-of-range years instead of extrapolating',()=>{
    expect(timeFactorAt(0)).toEqual(timeFactorAt(1));
    for(const k of VALUE_KEYS)expect(timeFactorAt(11)[k]).toBeCloseTo(timeFactorAt(10)[k]);
  });
});
describe('normalizeTimeline',()=>{
  it('dedupes, sorts and drops anchors',()=>{
    expect(normalizeTimeline([7,3,3,2,1,5,10])).toEqual([2,3,7]);
  });
  it('drops out-of-range and non-integer years',()=>{
    expect(normalizeTimeline([0,11,-3,2.5,Number.NaN,4])).toEqual([4]);
  });
  it('falls back to an empty timeline for missing or malformed input',()=>{
    expect(normalizeTimeline(undefined)).toEqual([]);
    expect(normalizeTimeline('3,7')).toEqual([]);
    expect(normalizeTimeline([1,5,10])).toEqual([]);
  });
});
