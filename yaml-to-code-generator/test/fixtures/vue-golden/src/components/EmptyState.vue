<script setup lang="ts">
defineProps<{
  entityName: string;
  message?: string;
  title?: string;
}>();
</script>

<template>
  <div class="empty-state" aria-live="polite">
    <div class="empty-icon" aria-hidden="true">&#9744;</div>
    <h2>{{ title ?? `No ${entityName}s found` }}</h2>
    <p class="empty-message">{{ message ?? `There are no ${entityName}s yet.` }}</p>
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md, 12px);
  padding: var(--space-2xl, 24px);
  text-align: center;
  color: var(--color-text-secondary, #666);
}
.empty-icon {
  font-size: 2.5em;
  opacity: 0.4;
}
.empty-state h2 {
  margin: 0;
  font-size: var(--font-size-lg, 1.25em);
  font-weight: var(--font-weight-semibold, 600);
}
.empty-message {
  margin: 0;
  font-size: var(--font-size-base, 1em);
}
</style>
