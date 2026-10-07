<script setup lang="ts">
import { ref, computed } from 'vue';
import { ANCHOR_HORIZONS } from '../../core/models';
import type { Horizon, OptionAnalysis } from '../../core/models';
import { MAX_HORIZON, MIN_HORIZON } from '../../core/horizon-service';

const props = defineProps<{ options: OptionAnalysis[]; horizons: Horizon[] }>();
const hidden = ref(new Set<string>());
const colors = ['#4f5db7', '#d58a32', '#8b5f88', '#3b8667'];

const W = 500, H = 280, PAD_L = 55, PAD_R = 30, PLOT_TOP = 20, PLOT_BOTTOM = 240;
// 横轴按年份真实比例，任何观察年都落在同一坐标，重复/乱序输入不会产生歧义位置
const x = (h: number) => PAD_L + (h - MIN_HORIZON) / (MAX_HORIZON - MIN_HORIZON) * (W - PAD_L - PAD_R);
const y = (score: number) => PLOT_BOTTOM - score * 2.0;

const years = computed(() => [...props.horizons].sort((a, b) => a - b));
const isAnchor = (h: number) => (ANCHOR_HORIZONS as readonly number[]).includes(h);
const path = (o: OptionAnalysis) => [...o.points].sort((a, b) => a.horizon - b.horizon)
  .map((p, i) => `${i ? 'L' : 'M'} ${x(p.horizon)} ${y(p.score)}`).join(' ');
const breakdownText = (o: OptionAnalysis, h: Horizon) => {
  const p = o.points.find(q => q.horizon === h);
  if (!p) return '';
  return `稳定 ${p.breakdown.stability} · 成长 ${p.breakdown.growth} · 自由 ${p.breakdown.freedom} · 金钱 ${p.breakdown.money}`;
};

function toggle(id: string) {
  const next = new Set(hidden.value);
  next.has(id) ? next.delete(id) : next.add(id);
  hidden.value = next;
}
const visible = computed(() => props.options.filter(o => !hidden.value.has(o.option.id)));
</script>

<template>
  <div class="curve-card">
    <div class="curve-head">
      <div><span>REGRET OVER TIME</span><h3>后悔曲线</h3></div>
      <div class="legend">
        <button v-for="(o, i) in options" :key="o.option.id" :class="{ off: hidden.has(o.option.id) }" @click="toggle(o.option.id)"><i :style="{ background: colors[i] }"></i>{{ o.option.name }}</button>
      </div>
    </div>
    <svg :viewBox="`0 0 ${W} ${H}`" role="img" aria-label="各选项一到十年的后悔指数曲线，实心点为规则锚点，空心点为插值推算的观察年">
      <g class="grid">
        <line v-for="v in [0, 25, 50, 75, 100]" :key="v" x1="55" x2="470" :y1="y(v)" :y2="y(v)" />
        <text v-for="v in [0, 25, 50, 75, 100]" :key="`t${v}`" x="22" :y="y(v) + 4">{{ v }}</text>
        <line v-for="h in ANCHOR_HORIZONS" :key="`a${h}`" :x1="x(h)" :x2="x(h)" :y1="PLOT_TOP" :y2="PLOT_BOTTOM" class="anchor-line" />
      </g>
      <g v-for="o in visible" :key="o.option.id">
        <path :d="path(o)" fill="none" :stroke="colors[options.indexOf(o)]" stroke-width="4" />
        <template v-for="p in [...o.points].sort((a, b) => a.horizon - b.horizon)" :key="p.horizon">
          <circle v-if="p.anchor" :cx="x(p.horizon)" :cy="y(p.score)" r="6" :fill="colors[options.indexOf(o)]">
            <title>{{ o.option.name }} · {{ p.horizon }} 年（规则锚点）：{{ p.score }}｜{{ breakdownText(o, p.horizon) }}</title>
          </circle>
          <circle v-else :cx="x(p.horizon)" :cy="y(p.score)" r="5.5" fill="#f8f6ef" :stroke="colors[options.indexOf(o)]" stroke-width="2.5">
            <title>{{ o.option.name }} · {{ p.horizon }} 年（插值推算）：{{ p.score }}｜{{ breakdownText(o, p.horizon) }}</title>
          </circle>
        </template>
      </g>
      <text v-for="h in years" :key="`l${h}`" :x="x(h)" y="262" text-anchor="middle"
            :class="{ 'anchor-label': isAnchor(h), 'mid-label': !isAnchor(h) }">{{ h }}</text>
    </svg>
    <p class="curve-foot">
      实心点为规则锚点 1 / 5 / 10 年（原始系数）；空心点为相邻锚点间<b>分段线性插值推算</b>的观察年（当前：{{ years.join('、') }} 年）。
      中间点只用于在同一条曲线上观察时点变化，总分仍只由三个锚点按 30% / 40% / 30% 汇合。推算基于本地规则，不是对未来的预测。
    </p>
  </div>
</template>
