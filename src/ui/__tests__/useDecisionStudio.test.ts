import{describe,expect,it}from'vitest';import{useDecisionStudio}from'../useDecisionStudio';import{createSampleDraft}from'../../core/sample-data';import type{SavedCase}from'../../core/models';
const repo=()=>{const store:SavedCase[]=[];return{list:()=>store,save:(c:SavedCase)=>{store.unshift(c)},delete:()=>{}}};
const printer={print:()=>{}};
describe('useDecisionStudio timeline',()=>{
  it('toggles observation years on and off',()=>{
    const s=useDecisionStudio(repo(),printer);
    s.toggleYear(3);s.toggleYear(7);
    expect(s.draft.timeline).toEqual([3,7]);
    s.toggleYear(3);
    expect(s.draft.timeline).toEqual([7]);
  });
  it('marks existing analysis stale when the timeline changes',()=>{
    const s=useDecisionStudio(repo(),printer);
    s.analyze();
    expect(s.stale.value).toBe(false);
    s.toggleYear(4);
    expect(s.stale.value).toBe(true);
  });
  it('saves and reloads the timeline with the case',()=>{
    const repository=repo();const s=useDecisionStudio(repository,printer);
    s.toggleYear(6);s.analyze();s.save();
    const saved=repository.list()[0];
    expect(saved.draft.timeline).toEqual([6]);
    const restored=useDecisionStudio(repository,printer);
    restored.load(saved);
    expect(restored.draft.timeline).toEqual([6]);
    expect(restored.analysis.value?.options[0].points.some(p=>p.kind==='observation')).toBe(true);
  });
  it('falls back to an empty timeline when loading old cases without one',()=>{
    const s=useDecisionStudio(repo(),printer);
    s.toggleYear(8);
    const legacy=JSON.parse(JSON.stringify({...createSampleDraft(),timeline:undefined}));
    delete legacy.timeline;
    s.load({draft:legacy});
    expect(s.draft.timeline).toEqual([]);
  });
  it('normalizes tampered timelines on load instead of crashing',()=>{
    const s=useDecisionStudio(repo(),printer);
    s.load({draft:{...createSampleDraft(),timeline:[9,2,2,0,11,5] as unknown as number[]}});
    expect(s.draft.timeline).toEqual([2,9]);
  });
});
