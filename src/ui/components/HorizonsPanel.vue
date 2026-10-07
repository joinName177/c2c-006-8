<script setup lang="ts">
import { computed, ref } from 'vue';
import { ANCHOR_HORIZONS, type Horizon } from '../../core/models';
import { addHorizon, availableYears, MAX_HORIZON, MIN_HORIZON } from '../../core/horizon-service';

const props = defineProps<{ horizons: Horizon[] }>();
const emit = defineEmits<{ add: [year: number]; remove: [year: number] }>();

const draftYear = ref<number | ''>('');
const localError = ref('');
const years = computed(() => Array.from({ length: MAX_HORIZON - MIN_HORIZON + 1 }, (_, i) => i + MIN_HORIZON));
const quickAdd = computed(() => availableYears(props.horizons));
const isAnchor = (y: number) => (ANCHOR_HORIZONS as readonly number[]).includes(y);

function submit() {
  if (draftYear.value === '') { localError.value = '请输入要观察的年份'; return; }
  const r = addHorizon(props.horizons, draftYear.value);
  if (r.error) { localError.value = r.error; return; }
  localError.value = '';
  emit('add', Number(draftYear.value));
  draftYear.value = '';
}
function pick(y: number) {
  const r = addHorizon(props.horizons, y);
  if (r.error) { localError.value = r.error; return; }
  localError.value = '';
  emit('add', y);
}
</script>

<template>
  <section class="paper-panel horizons">
    <span class="index">03 / TIME</span>
    <h2>想在哪些年份回头看？</h2>
    <p>1、5、10 年是规则锚点（实心点），始终保留；可加入 2–4、6–9 年在同一条曲线上查看中间时点（空心点）。</p>
    <div class="year-grid">
      <template v-for="y in years" :key="y">
        <button
          v-if="horizons.includes(y)"
          type="button"
          class="year-chip"
          :class="{ anchor: isAnchor(y) }"
          :disabled="isAnchor(y)"
          :title="isAnchor(y) ? '规则锚点，不可移除' : '移除该观察年'"
          @click="!isAnchor(y) && emit('remove', y)"
        >
          {{ y }} 年<span v-if="!isAnchor(y)">×</span>
        </button>
        <button v-else type="button" class="year-chip empty" @click="pick(y)">＋{{ y }}</button>
      </template>
    </div>
    <form class="year-add" @submit.prevent="submit">
      <input v-model.number="draftYear" type="number" :min="MIN_HORIZON" :max="MAX_HORIZON" step="1"
             :placeholder="`或直接输入 ${MIN_HORIZON}–${MAX_HORIZON} 的整数年`">
      <button type="submit">添加观察年</button>
      <span v-if="localError" class="year-error">{{ localError }}</span>
    </form>
    <ul class="year-notes">
      <li>中间年份由相邻锚点的时间系数<b>分段线性插值后重新评分</b>，不是套用 1/5/10 的旧分；锚点本身结果不变。</li>
      <li>规则只定义在 {{ MIN_HORIZON }}–{{ MAX_HORIZON }} 年内，<b>不做外推</b>；总分仍只按锚点 30% / 40% / 30% 汇合，与观察年无关。</li>
    </ul>
  </section>
</template>
