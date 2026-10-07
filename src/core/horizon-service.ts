import {ANCHOR_HORIZONS, type Horizon} from './models';

/** 规则覆盖的观察范围：锚点之间允许整数年；锚点之外一律不做外推 */
export const MIN_HORIZON=1;
export const MAX_HORIZON=10;

/**
 * 归一化观察年份：合并三个锚点 → 去重 → 升序排序 → 丢弃范围外/非整数输入。
 * 无论调用方传入重复、乱序还是脏数据，结果唯一确定，避免画出歧义曲线。
 * 宽容模式用于读取历史档案等边界场景；缺失字段也会回退为三个锚点。
 */
export function normalizeHorizons(input: unknown):Horizon[] {
  const raw=Array.isArray(input)?input:[];
  const years=raw
    .map(Number)
    .filter(h=>Number.isInteger(h)&&h>=MIN_HORIZON&&h<=MAX_HORIZON);
  return Array.from(new Set<Horizon>([...ANCHOR_HORIZONS,...years])).sort((a,b)=>a-b);
}

/** 严格校验：输入不合法时给出面向用户的错误信息（用于分析前的表单校验） */
export function validateHorizons(input: unknown):string[] {
  if(!Array.isArray(input))return['观察年份设置无效，请使用 1–10 之间的整数年份'];
  const errors:string[]=[];
  const seen=new Set<number>();
  for(const value of input){
    const year=Number(value);
    if(!Number.isInteger(year)){errors.push(`观察年份「${value}」不是整数年份`);continue}
    if(year<MIN_HORIZON||year>MAX_HORIZON){errors.push(`观察年份 ${year} 超出规则范围：仅支持 ${MIN_HORIZON}–${MAX_HORIZON} 年，不做外推`);continue}
    if(seen.has(year))errors.push(`观察年份 ${year} 重复，请只保留一个`);
    seen.add(year);
  }
  for(const anchor of ANCHOR_HORIZONS){
    if(!seen.has(anchor))errors.push(`${anchor} 年是规则锚点，不能移除`);
  }
  return errors;
}

/** 用户新增观察年：返回归一化后的新列表与错误提示；失败时列表原样返回 */
export function addHorizon(current: Horizon[], raw: unknown):{horizons:Horizon[];error?:string}{
  const year=Number(raw);
  if(trim(raw)===''||!Number.isInteger(year))return{horizons:current,error:'请输入整数年份'};
  if(year<MIN_HORIZON||year>MAX_HORIZON)return{horizons:current,error:`只支持 ${MIN_HORIZON}–${MAX_HORIZON} 年；锚点之外不外推`};
  if(current.includes(year))return{horizons:current,error:`${year} 年已在观察列表中`};
  return{horizons:normalizeHorizons([...current,year])};
}

/** 只能移除中间观察年；锚点拒绝移除 */
export function removeHorizon(current: Horizon[], year: number):Horizon[]{
  return (ANCHOR_HORIZONS as readonly number[]).includes(year)?current:current.filter(h=>h!==year);
}

/** 尚未被观察的 1–10 整数年（供界面快捷选择） */
export function availableYears(current: Horizon[]):number[]{
  const all=Array.from({length:MAX_HORIZON-MIN_HORIZON+1},(_,i)=>i+MIN_HORIZON);
  return all.filter(y=>!current.includes(y));
}

export const isAnchor=(year:number):boolean=>(ANCHOR_HORIZONS as readonly number[]).includes(year);

function trim(v:unknown):string{return typeof v==='string'?v.trim():String(v??'')}
