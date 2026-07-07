
<script setup lang="ts">
import { ref, computed } from 'vue';
import FormField from '../components/FormField.vue';
import type { User } from '../domain/user/user.types';

import type { UserRole } from '../domain/user/user.types';
import { UserRole_LABELS } from '../domain/user/user.types';






const name = ref<string>('');

const avatar = ref<string | null>(null);

const role = ref<UserRole>('');


const emit = defineEmits<{
  submit: [data: Partial<User>];
}>();

const refs: Record<string, any> = {
  name: name,
  avatar: avatar,
  role: role,
};

const formFields = computed(() => [
  {
    htmlId: 'name',
    label: 'Name',
    type: 'text' as const,
    options: undefined,
    required: true,
  },
  {
    htmlId: 'avatar',
    label: 'Avatar',
    type: 'text' as const,
    options: undefined,
    required: false,
  },
  {
    htmlId: 'role',
    label: 'Role',
    type: 'select' as const,
    options: Object.entries(UserRole_LABELS).map(([value, label]) => ({ value, label })),
    required: true,
  },
]);

function handleSubmit() {
  emit('submit', {    name: name.value,
    avatar: avatar.value,
    role: role.value
  });
}
</script>

<template>
  <form @submit.prevent="handleSubmit" class="entity-form">
    <fieldset>
      <legend>User Details</legend>
    <FormField
      v-for="field in formFields"
      :key="field.htmlId"
      v-model="refs[field.htmlId].value"
      v-bind="field"
    />
    </fieldset>
    <button type="submit" aria-label="Save User">Save</button>
  </form>
</template>

<style scoped>
.entity-form { display: flex; flex-direction: column; gap: 12px; max-width: 500px; }
button { padding: 10px 16px; background: var(--color-primary, #42b883); color: white; border: none; border-radius: 4px; cursor: pointer; }
@media (min-width: 768px) {
  .entity-form { max-width: 500px; }
}
@media (max-width: 576px) {
  button { width: 100%; min-height: 44px; min-width: 44px; }
  .form-group input, .form-group textarea, .form-group select { font-size: 16px; }
}
</style>
