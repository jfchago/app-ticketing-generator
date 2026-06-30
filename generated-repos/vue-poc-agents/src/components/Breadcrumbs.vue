<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

const breadcrumbs = computed(() => {
  return route.matched
    .filter((r) => r.meta?.breadcrumb)
    .map((r, i, arr) => ({
      text: r.meta.breadcrumb as string,
      to: i < arr.length - 1 ? r.path : undefined,
    }));
});
</script>

<template>
  <nav v-if="breadcrumbs.length > 1" class="breadcrumbs" aria-label="Breadcrumb">
    <ol>
      <li v-for="(crumb, index) in breadcrumbs" :key="index">
        <router-link v-if="crumb.to" :to="crumb.to">{{ crumb.text }}</router-link>
        <span v-else aria-current="page">{{ crumb.text }}</span>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.breadcrumbs {
  padding: var(--space-sm, 8px) var(--space-lg, 16px);
  background: var(--color-bg-secondary, #f5f5f5);
  border-bottom: 1px solid var(--color-border, #ddd);
}
.breadcrumbs ol {
  list-style: none;
  display: flex;
  padding: 0;
  margin: 0 0 var(--space-md, 12px);
}
.breadcrumbs li + li::before {
  content: '/';
  margin: 0 var(--space-sm, 8px);
  color: var(--color-text-secondary, #666);
}
.breadcrumbs a {
  color: var(--color-text-secondary, #666);
  text-decoration: none;
}
.breadcrumbs a:hover {
  color: var(--color-primary, #42b883);
}
.breadcrumbs [aria-current='page'] {
  color: var(--color-text, #333);
  font-weight: var(--font-weight-semibold, 600);
}
</style>
