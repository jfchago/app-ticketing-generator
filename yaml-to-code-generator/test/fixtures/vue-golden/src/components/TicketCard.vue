
<script setup lang="ts">
defineProps<{
  item: Record<string, any>;
}>();

defineEmits<{
  click: [id: string];
}>();
</script>

<template>
  <div class="card" @click="$emit('click', item.id)">
    <h3>{{ item.title ?? item.name ?? item.id }}</h3>
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
