import{describe,expect,it}from'vitest';import{analyzeDecision}from'../analysis-service';import{createSampleDraft}from'../sample-data';import type{DecisionDraft}from'../models';
const draftWith=(timeline:DecisionDraft['timeline']):DecisionDraft=>({...createSampleDraft(),timeline});
const option=(analysis:ReturnType<typeof analyzeDecision>,id:string)=>analysis.options.find(o=>o.option.id===id)!;
describe('analyzeDecision timeline',()=>{
  it('keeps anchor scores, totals and recommendation identical when observation years are added',()=>{
    const base=analyzeDecision(draftWith([]));
    const observed=analyzeDecision(draftWith([2,3,7]));
    expect(observed.options.map(o=>o.total)).toEqual(base.options.map(o=>o.total));
    expect(observed.recommendation).toBe(base.recommendation);
    for(const id of['stay','leave','prepare']){
      const anchors=option(observed,id).points.filter(p=>p.kind==='anchor');
      expect(anchors.map(p=>[p.horizon,p.score])).toEqual(option(base,id).points.map(p=>[p.horizon,p.score]));
    }
  });
  it('computes observation years from interpolated rules, not relabeled anchor scores',()=>{
    const stay=option(analyzeDecision(draftWith([3])),'stay');
    expect(stay.points.map(p=>p.horizon)).toEqual([1,3,5,10]);
    const year3=stay.points.find(p=>p.horizon===3)!;
    expect(year3.kind).toBe('observation');
    expect(year3.score).toBe(36);
    expect(year3.score).not.toBe(stay.points[0].score);
    expect(year3.score).not.toBe(stay.points[2].score);
    expect(year3.breakdown).toEqual({stability:3.3,growth:18.4,freedom:9,money:4.8});
  });
  it('marks kinds and keeps points sorted by year',()=>{
    const stay=option(analyzeDecision(draftWith([9,2,6])),'stay');
    expect(stay.points.map(p=>[p.horizon,p.kind])).toEqual([[1,'anchor'],[2,'observation'],[5,'anchor'],[6,'observation'],[9,'observation'],[10,'anchor']]);
  });
  it('generates rehearsal cards only for the three anchors',()=>{
    const stay=option(analyzeDecision(draftWith([2,3,4,6,7,8,9])),'stay');
    expect(stay.cards.map(c=>c.horizon)).toEqual([1,5,10]);
  });
  it('treats shuffled, duplicated and out-of-range timelines as the same normalized timeline',()=>{
    const messy=analyzeDecision(draftWith([9,2,2,0,11,6.5,5]));
    const clean=analyzeDecision(draftWith([2,9]));
    expect(JSON.stringify(messy)).toBe(JSON.stringify(clean));
  });
  it('does not mutate the draft',()=>{
    const draft=draftWith([3,7]);const snapshot=JSON.stringify(draft);
    analyzeDecision(draft);
    expect(JSON.stringify(draft)).toBe(snapshot);
  });
});
