<script setup lang="ts">
defineProps<{ assigneeId?: string | null }>();
</script>

<template>
  <span v-if="assigneeId" class="assignee-badge">{{ assigneeId }}</span>
  <span v-else class="assignee-badge unassigned">Unassigned</span>
</template>

<style scoped>
.assignee-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.85em;
}
.unassigned {
  color: var(--color-neutral-text, #364153);
}
</style>
