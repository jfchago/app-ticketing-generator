
<script setup lang="ts">
import { computed } from 'vue';

const model = defineModel<string | null>({ required: true });

const props = withDefaults(defineProps<{
  label: string;
  type: 'text' | 'textarea' | 'select' | 'fk-select';
  htmlId: string;
  options?: { label: string; value: string }[];
  required?: boolean;
}>(), {
  required: false,
  options: () => [],
});

const helperText = computed(() => `Enter the ${props.label}`);
</script>

<template>
  <div class="form-group">
    <label :for="htmlId">{{ label }}</label>

    <textarea
      v-if="type === 'textarea'"
      :id="htmlId"
      v-model="model"
      :required="required"
      :aria-describedby="htmlId + '-desc'"
    ></textarea>

    <select
      v-else-if="type === 'select' || type === 'fk-select'"
      :id="htmlId"
      v-model="model"
      :required="required"
      :aria-describedby="htmlId + '-desc'"
    >
      <option value="" disabled>Select...</option>
      <option
        v-for="opt in options"
        :key="opt.value"
        :value="opt.value"
      >
        {{ opt.label }}
      </option>
    </select>

    <input
      v-else
      :id="htmlId"
      v-model="model"
      type="text"
      :required="required"
      :aria-describedby="htmlId + '-desc'"
    />

    <span :id="htmlId + '-desc'" class="sr-only">{{ helperText }}</span>
  </div>
</template>

<style scoped>
.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs, 4px);
}
.form-group label {
  font-weight: 600;
}
.form-group input,
.form-group textarea,
.form-group select {
  padding: 8px;
  border: 1px solid var(--color-border, #ddd);
  border-radius: 4px;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
</style>
