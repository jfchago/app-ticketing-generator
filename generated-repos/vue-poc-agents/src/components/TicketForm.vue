<script setup lang="ts">
import { ref, computed } from 'vue';
import FormField from '../components/FormField.vue';
import type { Ticket } from '../domain/ticket/ticket.types';

import type { TicketStatus, TicketPriority } from '../domain/ticket/ticket.types';
import { TicketStatus_LABELS, TicketPriority_LABELS } from '../domain/ticket/ticket.types';

import { onMounted } from 'vue';

import { useUserStore } from '../stores/user.store';
const userStore = useUserStore();

onMounted(() => {
  userStore.loadUsers();
});

const title = ref<string>('');

const description = ref<string | null>(null);

const status = ref<TicketStatus>('OPEN');

const priority = ref<TicketPriority>('MEDIUM');

const assigneeId = ref<string | null>(null);

const emit = defineEmits<{
  submit: [data: Partial<Ticket>];
}>();

const refs: Record<string, any> = {
  title: title,
  description: description,
  status: status,
  priority: priority,
  assigneeId: assigneeId,
};

const formFields = computed(() => [
  {
    htmlId: 'title',
    label: 'Title',
    type: 'text' as const,
    options: undefined,
    required: true,
  },
  {
    htmlId: 'description',
    label: 'Description',
    type: 'textarea' as const,
    options: undefined,
    required: false,
  },
  {
    htmlId: 'status',
    label: 'Status',
    type: 'select' as const,
    options: Object.entries(TicketStatus_LABELS).map(([value, label]) => ({ value, label })),
    required: true,
  },
  {
    htmlId: 'priority',
    label: 'Priority',
    type: 'select' as const,
    options: Object.entries(TicketPriority_LABELS).map(([value, label]) => ({ value, label })),
    required: true,
  },
  {
    htmlId: 'assigneeId',
    label: 'Assignee Id',
    type: 'fk-select' as const,
    options: (userStore.users || []).map((item) => ({ value: item.id, label: item.name })),
    required: false,
  },
]);

function handleSubmit() {
  emit('submit', {
    title: title.value,
    description: description.value,
    status: status.value,
    priority: priority.value,
    assigneeId: assigneeId.value,
  });
}
</script>

<template>
  <form @submit.prevent="handleSubmit" class="entity-form">
    <fieldset>
      <legend>Ticket Details</legend>
      <FormField
        v-for="field in formFields"
        :key="field.htmlId"
        v-model="refs[field.htmlId].value"
        v-bind="field"
      />
    </fieldset>
    <button type="submit" aria-label="Save Ticket">Save</button>
  </form>
</template>

<style scoped>
.entity-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 500px;
}
button {
  padding: 10px 16px;
  background: var(--color-primary, #42b883);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
@media (min-width: 768px) {
  .entity-form {
    max-width: 500px;
  }
}
@media (max-width: 576px) {
  button {
    width: 100%;
    min-height: 44px;
    min-width: 44px;
  }
  .form-group input,
  .form-group textarea,
  .form-group select {
    font-size: 16px;
  }
}
</style>
