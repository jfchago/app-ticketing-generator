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
</style>
