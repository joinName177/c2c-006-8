import{ANCHOR_HORIZONS,MAX_YEAR,MIN_YEAR,VALUE_KEYS,type Horizon,type ValueKey}from'./models';
const ANCHOR_TIME_FACTOR:Record<Horizon,Record<ValueKey,number>>={1:{stability:1.2,growth:.75,freedom:.8,money:1.15},5:{stability:1,growth:1,freedom:1,money:1},10:{stability:.8,growth:1.25,freedom:1.2,money:.85}};
const ANCHOR_SET:ReadonlySet<number>=new Set(ANCHOR_HORIZONS);
export function isAnchor(year:number):year is Horizon{return ANCHOR_SET.has(year)}
// 中间年份的时间系数：在相邻锚点之间按距离分段线性插值。
// 锚点年份直接查表返回，保证相同输入下 1/5/10 年结果与插值引入前完全一致。
// 不使用样条等平滑曲线：插值段内单调、可手算复核，且不会在锚点之间产生规则并不支持的过冲。
export function timeFactorAt(year:number):Record<ValueKey,number>{
  if(isAnchor(year))return{...ANCHOR_TIME_FACTOR[year]};
  const clamped=Math.min(MAX_YEAR,Math.max(MIN_YEAR,year));
  const[lo,hi]=clamped<5?[1,5]as[Horizon,Horizon]:[5,10]as[Horizon,Horizon];
  const t=(clamped-lo)/(hi-lo);
  return Object.fromEntries(VALUE_KEYS.map(k=>[k,ANCHOR_TIME_FACTOR[lo][k]+(ANCHOR_TIME_FACTOR[hi][k]-ANCHOR_TIME_FACTOR[lo][k])*t]))as Record<ValueKey,number>;
}
// 观察年份归一化：转整数、限制在锚点覆盖的 [1,10] 区间（不外推）、剔除锚点、去重、升序。
// 重复、乱序或越界的输入（包括旧版本存档）都得到唯一确定的时间线，曲线不会出现歧义。
export function normalizeTimeline(years:unknown):number[]{
  if(!Array.isArray(years))return[];
  const valid=years.map(Number).filter(y=>Number.isInteger(y)&&y>=MIN_YEAR&&y<=MAX_YEAR&&!isAnchor(y));
  return[...new Set(valid)].sort((a,b)=>a-b);
}
