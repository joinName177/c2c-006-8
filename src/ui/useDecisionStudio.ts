import{reactive,ref}from'vue';import{analyzeDecision}from'../core/analysis-service';import{createSampleDraft}from'../core/sample-data';import{validateDraft}from'../core/validation';import{addHorizon as addYear,normalizeHorizons,removeHorizon as removeYear}from'../core/horizon-service';
import type{DecisionAnalysis,DecisionDraft,DecisionOption,Horizon,SavedCase,ValueWeights}from'../core/models';import type{CaseRepository}from'../ports/case-repository.port';import type{PrintPort}from'../ports/print.port';

const sameYears=(a:Horizon[]|undefined,b:Horizon[])=>Array.isArray(a)&&a.length===b.length&&a.every((h,i)=>h===b[i]);

export function useDecisionStudio(repository:CaseRepository,printer:PrintPort){
  const draft=reactive<DecisionDraft>(createSampleDraft());
  const analysis=ref<DecisionAnalysis>();
  const errors=ref<string[]>([]);
  const notice=ref('');
  const stale=ref(false);
  const cases=ref<SavedCase[]>(repository.list());
  const touch=()=>{stale.value=Boolean(analysis.value);draft.updatedAt=new Date().toISOString()};
  function setWeights(weights:ValueWeights){draft.weights={...weights};touch()}
  function addOption(){if(draft.options.length>=4)return;draft.options.push({id:`option-${Date.now()}`,name:'新选项',description:'',impacts:{stability:0,growth:0,freedom:0,money:0},reversibility:70});touch()}
  function removeOption(id:string){if(draft.options.length<=2)return;draft.options=draft.options.filter(o=>o.id!==id);touch()}
  function updateOption(id:string,patch:Partial<DecisionOption>){const target=draft.options.find(o=>o.id===id);if(target)Object.assign(target,patch);touch()}
  /** 观察年操作委托给核心层：锚点不可删，范围外/重复被拒绝 */
  function addHorizon(year:number){const r=addYear(draft.horizons,year);if(r.error){notice.value=r.error;return}draft.horizons=r.horizons;notice.value='';touch()}
  function removeHorizon(year:number){draft.horizons=removeYear(draft.horizons,year);notice.value='';touch()}
  function analyze(){errors.value=validateDraft(draft);if(errors.value.length)return;analysis.value=analyzeDecision(draft);stale.value=false;notice.value=''}
  function save(){repository.save({draft:JSON.parse(JSON.stringify(draft)),analysis:analysis.value});cases.value=repository.list()}
  function load(item:SavedCase){
    const restored=JSON.parse(JSON.stringify(item.draft)) as DecisionDraft;
    // 保存重开与屏幕使用同一套时间设置；旧档案（无 horizons 或脏数据）确定性回退为三锚点
    restored.horizons=normalizeHorizons(restored.horizons);
    Object.assign(draft,restored);
    // 结果只在与当前时间设置完全一致时复用；否则丢弃，避免曲线与年份设置产生歧义
    if(item.analysis&&sameYears(item.analysis.horizons,draft.horizons)){analysis.value=item.analysis;stale.value=false;notice.value=''}
    else{analysis.value=undefined;stale.value=false;notice.value='该案例的观察年份设置与已存结果不一致（或来自旧版本），请重新推演。'}
  }
  function remove(id:string){repository.delete(id);cases.value=repository.list()}
  return{draft,analysis,errors,notice,stale,cases,touch,setWeights,addOption,removeOption,updateOption,addHorizon,removeHorizon,analyze,save,load,remove,print:()=>printer.print()};
}
