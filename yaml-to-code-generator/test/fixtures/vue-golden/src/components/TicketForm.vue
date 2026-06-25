<script setup lang="ts">
import { ref } from "vue";
import type { Ticket } from "../domain/ticket/ticket.types";

import type {
  TicketStatus,
  TicketPriority,
} from "../domain/ticket/ticket.types";
import {
  TicketStatus_LABELS,
  TicketPriority_LABELS,
} from "../domain/ticket/ticket.types";

const emit = defineEmits<{
  submit: [data: Partial<Ticket>];
}>();

const title = ref<string>("");

const description = ref<string | null>(null);

const status = ref<TicketStatus>("OPEN");

const priority = ref<TicketPriority>("MEDIUM");

const assigneeId = ref<string | null>(null);

const errors = ref<Record<string, string>>({});

function validateAll(): boolean {
  return Object.values(errors.value).every((e) => !e);
}

function handleSubmit() {
  if (!validateAll()) return;
  emit("submit", {
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
    <div class="form-group">
      <label for="title">Title</label>

      <input id="title" v-model="title" type="text" required />
    </div>

    <div class="form-group">
      <label for="description">Description</label>

      <textarea id="description" v-model="description"></textarea>
    </div>

    <div class="form-group">
      <label for="status">Status</label>

      <select id="status" v-model="status" required>
        <option value="" disabled>Select...</option>
        <option
          v-for="(label, value) in TicketStatus_LABELS"
          :key="value"
          :value="value"
        >
          {{ label }}
        </option>
      </select>
    </div>

    <div class="form-group">
      <label for="priority">Priority</label>

      <select id="priority" v-model="priority" required>
        <option value="" disabled>Select...</option>
        <option
          v-for="(label, value) in TicketPriority_LABELS"
          :key="value"
          :value="value"
        >
          {{ label }}
        </option>
      </select>
    </div>

    <div class="form-group">
      <label for="assigneeId">AssigneeId</label>

      <input id="assigneeId" v-model="assigneeId" type="text" />
    </div>

    <button type="submit">Save</button>
  </form>
</template>

<style scoped>
.entity-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 500px;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
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
button {
  padding: 10px 16px;
  background: var(--color-primary, #42b883);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.error-message {
  color: #e74c3c;
  font-size: 0.85em;
  padding: 4px 0;
}
</style>
