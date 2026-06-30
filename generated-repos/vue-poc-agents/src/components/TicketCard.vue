<script setup lang="ts">
import type { Ticket } from '../domain/ticket/ticket.types';

defineProps<{
  item: Ticket;
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
    :aria-label="item.title"
    @click="$emit('click', item.id)"
    @keydown.enter="$emit('click', item.id)"
    @keydown.space.prevent="$emit('click', item.id)"
  >
    <h3>{{ item.title }}</h3>

    <p v-if="item.description">{{ item.description }}</p>
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
