import{normalizeWeights}from'./weight-service';
import{VALUE_KEYS,VALUE_LABELS,ANCHOR_HORIZONS,type AnchorHorizon,type DecisionAnalysis,type DecisionDraft,type Horizon,type OptionAnalysis,type RegretPoint,type RehearsalCard,type ValueKey,type ValueWeights}from'./models';
import{normalizeHorizons}from'./horizon-service';

/**
 * 时间规则只在 1/5/10 三个锚点上直接定义系数（原始规则，数值从未改动）。
 * 锚点之间的观察年（如 3、7）对四个维度系数分别做【分段线性插值】：
 * 在 [1,5]、[5,10] 两段内按年份比例混合两端系数，再代入原评分公式重算。
 * 选线性插值而非样条平滑：仅三个锚点时平滑曲线没有数据依据且可能产生
 * 规则从未给出的越界系数；线性结果可手工复核，且在锚点处严格恒等。
 * 锚点之外（<1 或 >10）不存在系数，analyzeDecision 前的校验会拒绝，
 * 这里防御性地夹回最近锚点——即绝不外推。
 */
const timeFactor:Record<AnchorHorizon,Record<ValueKey,number>>={
  1:{stability:1.2,growth:.75,freedom:.8,money:1.15},
  5:{stability:1,growth:1,freedom:1,money:1},
  10:{stability:.8,growth:1.25,freedom:1.2,money:.85},
};

const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;

/** 取某年各维度时间系数：锚点直接返回原表，中间年按所属分段线性插值 */
export function factorForYear(year:Horizon):Record<ValueKey,number>{
  if((ANCHOR_HORIZONS as readonly number[]).includes(year))
    return {...timeFactor[year as AnchorHorizon]};
  const clamped=Math.max(ANCHOR_HORIZONS[0],Math.min(ANCHOR_HORIZONS[2],year));
  const [lo,hi]:[AnchorHorizon,AnchorHorizon]=clamped<ANCHOR_HORIZONS[1]?[1,5]:[5,10];
  const t=(clamped-lo)/(hi-lo);
  return Object.fromEntries(VALUE_KEYS.map(k=>[k,lerp(timeFactor[lo][k],timeFactor[hi][k],t)])) as ValueWeights;
}

function point(option:DecisionDraft['options'][number],weights:ReturnType<typeof normalizeWeights>,horizon:Horizon):RegretPoint{
  const factors=factorForYear(horizon);
  const breakdown={}as RegretPoint['breakdown'];
  let total=0;
  for(const key of VALUE_KEYS){
    const negative=(5-option.impacts[key])/10;
    // 与原公式一致，仅把锚点查表换成（锚点恒等的）取系数函数
    const value=negative*weights[key]*factors[key];
    breakdown[key]=Math.round(value*10)/10;
    total+=value;
  }
  // 不可逆成本本身就是年份的线性函数，中间年自然落在线性轨迹上
  const irreversible=(100-option.reversibility)*.08*(horizon/10);
  return{horizon,anchor:(ANCHOR_HORIZONS as readonly number[]).includes(horizon),score:Math.max(0,Math.min(100,Math.round(total+irreversible))),breakdown};
}

function card(option:DecisionDraft['options'][number],p:RegretPoint,weights:ReturnType<typeof normalizeWeights>):RehearsalCard{
  const key=VALUE_KEYS.slice().sort((a,b)=>weights[b]*(5-option.impacts[b])-weights[a]*(5-option.impacts[a]))[0];
  const label=VALUE_LABELS[key];
  return{horizon:p.horizon as AnchorHorizon,regret:`${p.horizon} 年后，你可能遗憾「${option.name}」没有更好照顾${label}。`,trigger:`当${label}需求持续得不到满足，后悔感可能升高。`,reversibility:option.reversibility>=60?'仍有较大调整空间':'改变成本可能随时间增加',action:`现在就为${label}设一个可检查的阶段目标。`};
}

export function safetyNoticesFor(text:string):string[]{
  const notices:string[]=[];
  if(/医疗|诊断|治疗|medical/i.test(text))notices.push('涉及医疗，请同时咨询合格医疗专业人士。');
  if(/法律|诉讼|合同|legal/i.test(text))notices.push('涉及法律，请同时咨询合格法律专业人士。');
  if(/投资|股票|理财|investment/i.test(text))notices.push('涉及投资，请评估承受能力并咨询持牌专业人士。');
  return notices;
}

export function analyzeDecision(draft:DecisionDraft):DecisionAnalysis{
  const weights=normalizeWeights(draft.weights);
  // 确定性归一化：重复、乱序、范围外输入都收敛为同一条唯一曲线
  const horizons=normalizeHorizons(draft.horizons);
  const anchorPoints=(points:RegretPoint[])=>ANCHOR_HORIZONS.map(h=>points.find(p=>p.horizon===h)!);
  const options:OptionAnalysis[]=draft.options.map(option=>{
    const points=horizons.map(h=>point(option,weights,h));
    const anchors=anchorPoints(points);
    return{
      option,
      points,
      // 预演卡只对应规则锚点：中间点用于在同一条曲线上观察，不生成额外叙事
      cards:anchors.map(p=>card(option,p,weights)),
      // 总分汇合年始终是 1/5/10（30/40/30），与观察年设置无关
      total:Math.round(anchors[0].score*.3+anchors[1].score*.4+anchors[2].score*.3),
    };
  }).sort((a,b)=>a.total-b.total);
  const close=options[1]&&options[1].total-options[0].total<5;
  return{
    options,
    recommendation:close?`「${options[0].option.name}」与「${options[1].option.name}」非常接近，建议补充信息后再决定。`:`目前看，「${options[0].option.name}」是更不容易后悔的方向。`,
    winnerId:close?undefined:options[0].option.id,
    notices:safetyNoticesFor(`${draft.title} ${draft.background}`),
    horizons,
  };
}
