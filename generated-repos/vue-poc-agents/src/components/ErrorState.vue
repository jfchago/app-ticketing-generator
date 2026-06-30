<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    message: string;
    errorType?: string;
    retryFn?: () => void;
  }>(),
  {
    errorType: 'unknown',
  },
);

const emit = defineEmits<{
  retry: [];
}>();

const errorLabel = computed(() => {
  const labels: Record<string, string> = {
    network: 'Network Error',
    notFound: 'Not Found',
    forbidden: 'Forbidden',
    server: 'Server Error',
    validation: 'Validation Error',
    unknown: 'Unknown Error',
  };
  return labels[props.errorType] ?? 'Unknown Error';
});

function handleRetry() {
  props.retryFn?.();
  emit('retry');
}
</script>

<template>
  <div class="error-state" role="alert" aria-live="assertive">
    <div class="error-icon" aria-hidden="true">&#9888;</div>
    <div class="error-type-badge">{{ errorLabel }}</div>
    <p class="error-message">{{ message }}</p>
    <button v-if="retryFn" class="btn-primary" aria-label="Retry loading" @click="handleRetry">
      Retry
    </button>
  </div>
</template>

<style scoped>
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md, 12px);
  padding: var(--space-2xl, 24px);
  background: var(--color-danger-light, #f8d7da);
  border: 1px solid var(--color-danger, #dc3545);
  border-radius: var(--radius-md, 6px);
  color: var(--color-danger, #dc3545);
  text-align: center;
}
.error-icon {
  font-size: 2em;
}
.error-type-badge {
  font-size: var(--font-size-sm, 0.85em);
  font-weight: var(--font-weight-semibold, 600);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.error-message {
  margin: 0;
  font-size: var(--font-size-base, 1em);
  color: var(--color-text, #333);
}
</style>
