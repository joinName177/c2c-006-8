import{describe,expect,it}from'vitest';import{mount}from'@vue/test-utils';import RegretCurve from'../components/RegretCurve.vue';import{analyzeDecision}from'../../core/analysis-service';import{createSampleDraft}from'../../core/sample-data';
const analysis=(timeline:number[])=>analyzeDecision({...createSampleDraft(),timeline});
describe('RegretCurve',()=>{
  it('maps x positions proportionally to the year value, not the point index',()=>{
    const wrapper=mount(RegretCurve,{props:{options:analysis([3]).options}});
    const first=wrapper.find('g:not(.grid)').findAll('circle');
    expect(Number(first[0].attributes('cx'))).toBe(55);
    expect(Number(first[1].attributes('cx'))).toBeCloseTo(145);
    expect(Number(first[3].attributes('cx'))).toBe(460);
  });
  it('renders observation years as hollow points with a rule-based note',()=>{
    const wrapper=mount(RegretCurve,{props:{options:analysis([3,7]).options}});
    const circles=wrapper.find('g:not(.grid)').findAll('circle');
    expect(circles[1].attributes('fill')).toBe('#f8f6ef');
    expect(circles[0].attributes('fill')).not.toBe('#f8f6ef');
    expect(wrapper.text()).toContain('不参与总分');
    expect(wrapper.text()).toContain('不是对未来的预测');
  });
  it('keeps the legacy three-anchor rendering when no observation years exist',()=>{
    const wrapper=mount(RegretCurve,{props:{options:analysis([]).options}});
    expect(wrapper.find('g:not(.grid)').findAll('circle')).toHaveLength(3);
    expect(wrapper.text()).not.toContain('空心点');
  });
  it('labels every year on the axis exactly once',()=>{
    const wrapper=mount(RegretCurve,{props:{options:analysis([2,9]).options}});
    const labels=wrapper.findAll('svg>text').map(t=>t.text());
    expect(labels).toEqual(['1 年','2 年','5 年','9 年','10 年']);
  });
});
