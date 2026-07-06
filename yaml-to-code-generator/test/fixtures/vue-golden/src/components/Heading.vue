
<script setup lang="ts">
defineProps<{
  level: 1 | 2 | 3 | 4;
}>();
</script>

<template>
  <component :is="'h' + level" class="heading">
    <slot />
  </component>
</template>

<style scoped>
.heading {
  margin: 0;
}
.heading:is(h1) {
  font-size: var(--font-size-2xl, 1.875rem);
  font-weight: var(--font-weight-bold, 700);
  line-height: var(--line-height-tight, 1.2);
}
.heading:is(h2) {
  font-size: var(--font-size-xl, 1.5em);
  font-weight: var(--font-weight-semibold, 600);
  line-height: var(--line-height-tight, 1.2);
}
.heading:is(h3) {
  font-size: var(--font-size-lg, 1.25em);
  font-weight: var(--font-weight-semibold, 600);
  line-height: var(--line-height-normal, 1.5);
}
.heading:is(h4) {
  font-size: var(--font-size-md, 1.125rem);
  font-weight: var(--font-weight-semibold, 600);
  line-height: var(--line-height-normal, 1.5);
}
</style>
