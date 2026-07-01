<script setup lang="ts">
withDefaults(defineProps<{
  size?: 'sm' | 'md' | 'lg'
}>(), {
  size: 'md',
});
</script>

<template>
  <div class="spinner" role="status" aria-label="Loading" aria-live="polite">
    <div class="spinner-ring" />
  </div>
</template>

<style scoped>
.spinner {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: var(--space-xl, 20px);
}
.spinner-ring {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-neutral-light, #e9ecef);
  border-top-color: var(--color-primary, #42b883);
  border-radius: 50%;
  animation: spin var(--transition-slow, 300ms) linear infinite;
}
.spinner[aria-label] .spinner-ring {
  width: v-bind(size === 'sm' ? '20px' : size === 'lg' ? '48px' : '32px');
  height: v-bind(size === 'sm' ? '20px' : size === 'lg' ? '48px' : '32px');
  border-width: v-bind(size === 'sm' ? '2px' : size === 'lg' ? '4px' : '3px');
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
