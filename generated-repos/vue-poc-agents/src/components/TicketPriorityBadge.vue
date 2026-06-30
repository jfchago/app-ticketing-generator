<script setup lang="ts">
defineProps<{ priority: string }>();
</script>

<template>
  <span class="priority-badge" :class="'priority-' + priority.toLowerCase()">{{ priority }}</span>
</template>

<style scoped>
.priority-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.85em;
  font-weight: 600;
}

.priority-low {
  background: var(--color-success-light);
  color: var(--color-success-text);
}

.priority-medium {
  background: var(--color-primary-light);
  color: var(--color-primary-text);
}

.priority-high {
  background: var(--color-warning-light);
  color: var(--color-warning-text);
}

.priority-urgent {
  background: var(--color-danger-light);
  color: var(--color-danger-text);
}
</style>
