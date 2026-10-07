export const VALUE_KEYS=['stability','growth','freedom','money'] as const;
export type ValueKey=typeof VALUE_KEYS[number];
export type ValueWeights=Record<ValueKey,number>;
export interface DecisionOption{id:string;name:string;description:string;impacts:ValueWeights;reversibility:number}

/** 规则系数只定义在三个时间锚点；锚点不可移除，总分只由这三点汇合 */
export const ANCHOR_HORIZONS=[1,5,10] as const;
export type AnchorHorizon=typeof ANCHOR_HORIZONS[number];
/** 观察年份：1–10 的整数年，必须包含三个锚点，可加入中间年 */
export type Horizon=number;

export interface DecisionDraft{id:string;title:string;background:string;options:DecisionOption[];weights:ValueWeights;horizons:Horizon[];updatedAt:string}

export interface RegretPoint{
  horizon:Horizon;
  /** true=规则锚点（原 1/5/10 系数）；false=相邻锚点系数分段线性插值推算 */
  anchor:boolean;
  score:number;
  breakdown:ValueWeights;
}
export interface RehearsalCard{horizon:AnchorHorizon;regret:string;trigger:string;reversibility:string;action:string}
export interface OptionAnalysis{option:DecisionOption;points:RegretPoint[];cards:RehearsalCard[];total:number}
export interface DecisionAnalysis{options:OptionAnalysis[];recommendation:string;winnerId?:string;notices:string[];horizons:Horizon[]}
export interface SavedCase{draft:DecisionDraft;analysis?:DecisionAnalysis}
export const VALUE_LABELS:Record<ValueKey,string>={stability:'稳定',growth:'成长',freedom:'自由',money:'金钱'};
