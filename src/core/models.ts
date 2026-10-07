export const VALUE_KEYS=['stability','growth','freedom','money'] as const;
export type ValueKey=typeof VALUE_KEYS[number];
export type ValueWeights=Record<ValueKey,number>;
export interface DecisionOption{id:string;name:string;description:string;impacts:ValueWeights;reversibility:number}
export interface DecisionDraft{id:string;title:string;background:string;options:DecisionOption[];weights:ValueWeights;timeline:number[];updatedAt:string}
export const ANCHOR_HORIZONS=[1,5,10] as const;
export type Horizon=typeof ANCHOR_HORIZONS[number];
export const MIN_YEAR=1;
export const MAX_YEAR=10;
export type PointKind='anchor'|'observation';
export interface RegretPoint{horizon:number;kind:PointKind;score:number;breakdown:ValueWeights}
export interface RehearsalCard{horizon:Horizon;regret:string;trigger:string;reversibility:string;action:string}
export interface OptionAnalysis{option:DecisionOption;points:RegretPoint[];cards:RehearsalCard[];total:number}
export interface DecisionAnalysis{options:OptionAnalysis[];recommendation:string;winnerId?:string;notices:string[]}
export interface SavedCase{draft:DecisionDraft;analysis?:DecisionAnalysis}
export const VALUE_LABELS:Record<ValueKey,string>={stability:'稳定',growth:'成长',freedom:'自由',money:'金钱'};
