<script setup lang="ts">
defineProps<{ status: string }>();
</script>

<template>
  <span class="status-badge" :class="'status-' + status.toLowerCase()">{{ status }}</span>
</template>

<style scoped>
.status-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.85em;
  font-weight: 600;
}

.status-open {
  background: var(--color-primary-light);
  color: var(--color-primary-text);
}

.status-in_progress {
  background: var(--color-warning-light);
  color: var(--color-warning-text);
}

.status-resolved {
  background: var(--color-success-light);
  color: var(--color-success-text);
}

.status-closed {
  background: var(--color-neutral-light);
  color: var(--color-neutral-text);
}
</style>
