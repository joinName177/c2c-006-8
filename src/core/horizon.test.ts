import { describe, expect, it } from 'vitest';
import { analyzeDecision, factorForYear } from './analysis-service';
import { addHorizon, availableYears, normalizeHorizons, removeHorizon, validateHorizons } from './horizon-service';
import { ANCHOR_HORIZONS, type DecisionDraft } from './models';
import { createSampleDraft } from './sample-data';
import { validateDraft } from './validation';

const anchorFactors = {
  1: { stability: 1.2, growth: 0.75, freedom: 0.8, money: 1.15 },
  5: { stability: 1, growth: 1, freedom: 1, money: 1 },
  10: { stability: 0.8, growth: 1.25, freedom: 1.2, money: 0.85 },
} as const;

function draftWith(horizons: number[]): DecisionDraft {
  return { ...createSampleDraft(), horizons: [...horizons] };
}

describe('时间系数插值', () => {
  it('三个锚点返回原始系数，逐位不变', () => {
    for (const h of ANCHOR_HORIZONS) {
      expect(factorForYear(h)).toEqual({ ...anchorFactors[h] });
    }
  });

  it('中间年取相邻锚点的分段线性插值，t=0.5 时为两端均值', () => {
    const f3 = factorForYear(3); // 1→5 段，t=0.5
    expect(f3.stability).toBeCloseTo((1.2 + 1) / 2, 12);
    expect(f3.growth).toBeCloseTo((0.75 + 1) / 2, 12);
    expect(f3.money).toBeCloseTo((1.15 + 1) / 2, 12);

    const f7 = factorForYear(7); // 5→10 段，t=0.4
    const t = 0.4;
    expect(f7.growth).toBeCloseTo(1 + (1.25 - 1) * t, 12);
    expect(f7.freedom).toBeCloseTo(1 + (1.2 - 1) * t, 12);
    expect(f7.stability).toBeCloseTo(1 + (0.8 - 1) * t, 12);
  });

  it('2 年几乎贴近 1 年、9 年几乎贴近 10 年，但不与锚点相同（不是换标签套旧分）', () => {
    const f2 = factorForYear(2);
    expect(f2.stability).toBeGreaterThan(anchorFactors[5].stability);
    expect(f2.stability).toBeLessThan(anchorFactors[1].stability);
    const f9 = factorForYear(9);
    expect(f9.growth).toBeGreaterThan(anchorFactors[5].growth);
    expect(f9.growth).toBeLessThan(anchorFactors[10].growth);
  });

  it('锚点之外不产生外推系数：夹回最近锚点', () => {
    expect(factorForYear(11)).toEqual(factorForYear(10));
    expect(factorForYear(0)).toEqual(factorForYear(1));
  });
});

describe('分析结果：锚点恒等与观察年解耦', () => {
  it('只有三锚点时，结果结构与分值保持原规则', () => {
    const a = analyzeDecision(draftWith([1, 5, 10]));
    for (const o of a.options) {
      expect(o.points.map(p => p.horizon)).toEqual([1, 5, 10]);
      expect(o.points.every(p => p.anchor)).toBe(true);
      expect(o.cards).toHaveLength(3);
    }
    expect(a.horizons).toEqual([1, 5, 10]);
  });

  it('新增中间观察年不改变任何锚点分值、总分与推荐', () => {
    const base = analyzeDecision(draftWith([1, 5, 10]));
    const rich = analyzeDecision(draftWith([1, 3, 5, 7, 10]));
    expect(base.options.map(o => o.total)).toEqual(rich.options.map(o => o.total));
    expect(base.winnerId).toBe(rich.winnerId);
    expect(base.recommendation).toBe(rich.recommendation);
    base.options.forEach((bo, i) => {
      const ro = rich.options[i];
      expect(bo.points.map(p => p.score)).toEqual(ro.points.filter(p => p.anchor).map(p => p.score));
    });
  });

  it('中间点带真实四维拆解且标记为非锚点', () => {
    const years: number[] = [1, 2, 5, 10];
    const a = analyzeDecision(draftWith(years));
    for (const o of a.options) {
      const mid = o.points.find(p => p.horizon === 2)!;
      expect(mid.anchor).toBe(false);
      expect(Object.keys(mid.breakdown).sort()).toEqual(['freedom', 'growth', 'money', 'stability']);
      // 中间点不出预演卡（卡片只面向锚点）
      expect(o.cards).toHaveLength(3);
    }
  });

  it('乱序、重复年份与干净写法得到完全一致的分析', () => {
    const clean = analyzeDecision(draftWith([1, 3, 5, 10]));
    const messy = analyzeDecision(draftWith([10, 5, 3, 1, 3, 10]));
    expect(messy.horizons).toEqual([1, 3, 5, 10]);
    expect(JSON.stringify(messy)).toBe(JSON.stringify(clean));
  });
});

describe('观察年份归一化与校验', () => {
  it('始终合并锚点、去重并升序', () => {
    expect(normalizeHorizons([9, 2, 2, 5, 1])).toEqual([1, 2, 5, 9, 10]);
    expect(normalizeHorizons([])).toEqual([1, 5, 10]);
    expect(normalizeHorizons(undefined)).toEqual([1, 5, 10]);
  });

  it('宽容丢弃范围外、非整数、非数组脏数据（旧档案兼容）', () => {
    expect(normalizeHorizons([0, 11, 2.5, -3, '7', NaN, null])).toEqual([1, 5, 7, 10]);
    expect(normalizeHorizons('garbage')).toEqual([1, 5, 10]);
  });

  it('严格校验给出重复、范围外、缺锚点错误', () => {
    expect(validateHorizons([1, 5, 10])).toEqual([]);
    expect(validateHorizons([1, 5, 5, 10]).join()).toContain('重复');
    expect(validateHorizons([1, 5, 10, 11]).join()).toContain('超出规则范围');
    expect(validateHorizons([1, 10]).join()).toContain('5 年是规则锚点');
    expect(validateHorizons([3.5, 5, 10, 1]).join()).toContain('不是整数');
  });

  it('新增：拒绝重复与范围外；成功则自动排序', () => {
    expect(addHorizon([1, 5, 10], 5).error).toContain('已在');
    expect(addHorizon([1, 5, 10], 11).error).toContain('不外推');
    expect(addHorizon([1, 5, 10], 3).horizons).toEqual([1, 3, 5, 10]);
  });

  it('锚点不可移除，中间年可移除', () => {
    expect(removeHorizon([1, 3, 5, 10], 5)).toEqual([1, 3, 5, 10]);
    expect(removeHorizon([1, 3, 5, 10], 3)).toEqual([1, 5, 10]);
    expect(availableYears([1, 5, 10])).toEqual([2, 3, 4, 6, 7, 8, 9]);
  });

  it('脏年份设置会被表单校验拦截', () => {
    const d = draftWith([1, 5, 10, 20]);
    expect(validateDraft(d).join()).toContain('超出规则范围');
    expect(validateDraft(draftWith([1, 5, 10]))).toEqual([]);
  });
});

describe('锚点分值回归（对照评分公式直接计算）', () => {
  it('样例每个选项在 1/5/10 的分数等于公式直算值', () => {
    const draft = draftWith([1, 5, 10]);
    const weights = { stability: 30, growth: 35, freedom: 20, money: 15 };
    const a = analyzeDecision(draft);
    for (const opt of draft.options) {
      const got = a.options.find(o => o.option.id === opt.id)!;
      for (const h of ANCHOR_HORIZONS) {
        let total = 0;
        for (const k of ['stability', 'growth', 'freedom', 'money'] as const) {
          total += (5 - opt.impacts[k]) / 10 * weights[k] * anchorFactors[h][k];
        }
        total += (100 - opt.reversibility) * 0.08 * (h / 10);
        const expected = Math.max(0, Math.min(100, Math.round(total)));
        expect(got.points.find(p => p.horizon === h)!.score).toBe(expected);
      }
    }
  });
});
