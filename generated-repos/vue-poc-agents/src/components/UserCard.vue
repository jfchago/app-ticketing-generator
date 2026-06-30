<script setup lang="ts">
import type { User } from '../domain/user/user.types';

defineProps<{
  item: User;
}>();

defineEmits<{
  click: [id: string];
}>();
</script>

<template>
  <div
    class="card"
    role="button"
    tabindex="0"
    :aria-label="String(item.id)"
    @click="$emit('click', item.id)"
    @keydown.enter="$emit('click', item.id)"
    @keydown.space.prevent="$emit('click', item.id)"
  >
    <h3>{{ item.id }}</h3>
  </div>
</template>

<style scoped>
.card {
  border: 1px solid var(--color-border, #ddd);
  border-radius: 6px;
  padding: 12px;
  cursor: pointer;
}
.card:hover {
  border-color: var(--color-primary, #42b883);
}
</style>
