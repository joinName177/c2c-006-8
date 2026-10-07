<script setup lang="ts">import type{DecisionAnalysis}from'../../core/models';import RegretCurve from'./RegretCurve.vue';defineProps<{analysis:DecisionAnalysis;stale:boolean}>();</script>
<template>
  <section class="results">
    <div v-if="stale" class="stale-note">输入已变化，下方是上一次分析结果，请重新计算。</div>
    <div class="recommendation">
      <span>THE LEAST REGRETFUL PATH</span>
      <h2>最不后悔建议</h2>
      <p>{{analysis.recommendation}}</p>
      <aside v-for="notice in analysis.notices" :key="notice">{{notice}}</aside>
    </div>
    <RegretCurve :options="analysis.options" :horizons="analysis.horizons"/>
    <div class="score-grid">
      <article v-for="(item,index) in analysis.options" :key="item.option.id">
        <span>#0{{index+1}}</span>
        <h3>{{item.option.name}}</h3>
        <b>{{item.total}}<small>/100</small></b>
        <em class="total-note">总分仅汇合 1 / 5 / 10 锚点</em>
        <div>
          <i v-for="p in item.points" :key="p.horizon" :class="{derived:!p.anchor}"
             :title="`稳定 ${p.breakdown.stability} / 成长 ${p.breakdown.growth} / 自由 ${p.breakdown.freedom} / 金钱 ${p.breakdown.money}`">
            {{p.horizon}}年 {{p.score}}<sup v-if="!p.anchor">推</sup>
          </i>
        </div>
      </article>
    </div>
    <div class="rehearsals">
      <article v-for="item in analysis.options" :key="item.option.id">
        <h3>{{item.option.name}} · 后悔预演</h3>
        <div v-for="card in item.cards" :key="card.horizon">
          <b>{{card.horizon}} 年后 · 规则锚点</b>
          <p>{{card.regret}}</p>
          <small>{{card.trigger}} {{card.reversibility}}；{{card.action}}</small>
        </div>
      </article>
    </div>
  </section>
</template>
