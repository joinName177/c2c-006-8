import{describe,expect,it}from'vitest';import{mount}from'@vue/test-utils';import App from'../App.vue';
describe('App timeline integration',()=>{
  it('adds an observation year from the input tab and shows it on the result curve',async()=>{
    const wrapper=mount(App);
    const chips=wrapper.findAll('.year-chips button');
    expect(chips).toHaveLength(10);
    expect(chips[0].attributes('disabled')).toBeDefined();
    expect(chips[4].attributes('disabled')).toBeDefined();
    expect(chips[9].attributes('disabled')).toBeDefined();
    await chips[2].trigger('click');
    await wrapper.find('.analyze-button').trigger('click');
    expect(wrapper.text()).toContain('空心点为观察年份');
    expect(wrapper.text()).toContain('总分仅由 1 / 5 / 10 年锚点');
    expect(wrapper.find('g:not(.grid)').findAll('circle')).toHaveLength(4);
  });
  it('keeps the three-anchor view when no observation year is selected',async()=>{
    const wrapper=mount(App);
    await wrapper.find('.analyze-button').trigger('click');
    expect(wrapper.find('g:not(.grid)').findAll('circle')).toHaveLength(3);
    expect(wrapper.text()).not.toContain('空心点');
  });
});
