
<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { useTicketStore } from '../stores/ticket.store';
import { formatRelativeTime } from '../shared/date-utils';
import LoaderSpinner from '../components/LoaderSpinner.vue';
import ErrorState from '../components/ErrorState.vue';
import EmptyState from '../components/EmptyState.vue';

const props = defineProps<{
  entityId: string;
}>();

const store = useTicketStore();

const sentinel = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;

onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting && store.history?.hasMore && !store.history?.loadingMore) {
        store.fetchNextPage(props.entityId);
      }
    },
    { rootMargin: '200px' },
  );
  if (sentinel.value) observer.observe(sentinel.value);
});

watch(sentinel, (newVal) => {
  if (observer && newVal) {
    observer.disconnect();
    observer.observe(newVal);
  }
});

onUnmounted(() => {
  if (observer) observer.disconnect();
});

const actionColors: Record<string, { dot: string; bg: string; text: string; label: string }> = {
  created:          { dot: 'var(--color-timeline-created)', bg: 'var(--color-timeline-created-bg)', text: '#155724', label: 'Created' },
  status_changed:   { dot: 'var(--color-timeline-status-changed)', bg: 'var(--color-timeline-status-changed-bg)', text: '#0c5460', label: 'Status Changed' },
  assigned:         { dot: 'var(--color-timeline-assigned)', bg: 'var(--color-timeline-assigned-bg)', text: '#856404', label: 'Assigned' },
  priority_changed: { dot: 'var(--color-timeline-priority-changed)', bg: 'var(--color-timeline-priority-changed-bg)', text: '#563d7c', label: 'Priority Changed' },
};
</script>

<template>
  <div class="timeline-container" aria-live="polite">
    <LoaderSpinner v-if="store.history?.loadingInitial && (!store.history?.entries || store.history.entries.length === 0)" />
    <ErrorState v-else-if="store.history?.error && (!store.history?.entries || store.history.entries.length === 0)"
      :message="store.history.error" :retry-fn="() => store.getHistory(props.entityId)" />
    <EmptyState v-else-if="!store.history?.loadingInitial && (!store.history?.entries || store.history.entries.length === 0)"
      entity-name="Activity" message="No activity recorded yet" title="No activity recorded yet" />
    <div v-else class="timeline">
      <div
        v-for="entry in store.history?.entries ?? []"
        :key="entry.id"
        class="timeline-item"
        :style="{
          '--dot-color': actionColors[entry.actionType]?.dot ?? '#6c757d',
          '--item-bg': actionColors[entry.actionType]?.bg ?? '#e9ecef',
        }"
      >
        <div class="timeline-dot"></div>
        <div class="timeline-content">
          <div class="timeline-header">
            <span
              class="timeline-action-badge"
              :style="{
                background: actionColors[entry.actionType]?.bg ?? '#e9ecef',
                color: actionColors[entry.actionType]?.text ?? '#6c757d',
              }"
            >
              {{ actionColors[entry.actionType]?.label ?? entry.actionType }}
            </span>
            <span class="timeline-actor">{{ entry.actorName ?? entry.actorId }}</span>
            <span class="timeline-timestamp">{{ formatRelativeTime(entry.createdAt) }}</span>
          </div>
          <div v-if="entry.fieldName" class="timeline-field">
            <span class="field-label">{{ entry.fieldName }}:</span>
            <span class="field-old">{{ entry.oldValue ?? '(none)' }}</span>
            <span class="field-arrow">&rarr;</span>
            <span class="field-new">{{ entry.newValue ?? '(none)' }}</span>
          </div>
        </div>
      </div>
      <LoaderSpinner v-if="store.history?.loadingMore" size="sm" />
      <div ref="sentinel" v-if="store.history?.hasMore" class="scroll-sentinel"></div>
      <div v-if="store.history?.error && store.history?.entries && store.history.entries.length > 0" class="load-more-error">
        <p>{{ store.history.error }}</p>
        <button @click="store.fetchNextPage(props.entityId)">Retry</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.timeline-container {
  position: relative;
}
.timeline {
  position: relative;
  padding-left: 24px;
}
.timeline::before {
  content: '';
  position: absolute;
  left: 8px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--color-border, #ddd);
}
.timeline-item {
  position: relative;
  padding: var(--space-sm, 8px) 0;
  display: flex;
  gap: var(--space-md, 12px);
}
.timeline-dot {
  position: absolute;
  left: -20px;
  top: 14px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--dot-color, #6c757d);
  border: 2px solid var(--color-bg, #fff);
  z-index: 1;
}
.timeline-content {
  flex: 1;
  background: var(--item-bg, #e9ecef);
  border-radius: var(--radius-md, 6px);
  padding: var(--space-sm, 8px) var(--space-md, 12px);
  min-width: 0;
}
.timeline-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-xs, 4px) var(--space-sm, 8px);
  font-size: var(--font-size-sm, 0.85em);
}
.timeline-action-badge {
  display: inline-block;
  padding: 1px 6px;
  border-radius: var(--radius-sm, 4px);
  font-size: var(--font-size-xs, 0.75rem);
  font-weight: var(--font-weight-semibold, 600);
  white-space: nowrap;
}
.timeline-actor {
  font-weight: var(--font-weight-semibold, 600);
  color: var(--color-text, #333);
}
.timeline-timestamp {
  color: var(--color-text-secondary, #666);
  margin-left: auto;
  white-space: nowrap;
}
.timeline-field {
  margin-top: var(--space-xs, 4px);
  font-size: var(--font-size-sm, 0.85em);
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs, 4px);
  align-items: baseline;
}
.field-label {
  font-weight: var(--font-weight-semibold, 600);
  color: var(--color-text, #333);
}
.field-old {
  color: var(--color-text-secondary, #666);
  text-decoration: line-through;
}
.field-arrow {
  color: var(--color-text-secondary, #666);
}
.field-new {
  color: var(--color-text, #333);
  font-weight: var(--font-weight-semibold, 600);
}
.scroll-sentinel {
  height: 1px;
}
.load-more-error {
  display: flex;
  align-items: center;
  gap: var(--space-sm, 8px);
  padding: var(--space-sm, 8px);
  margin-top: var(--space-sm, 8px);
  background: var(--color-danger-light, #f8d7da);
  border-radius: var(--radius-sm, 4px);
  font-size: var(--font-size-sm, 0.85em);
  color: var(--color-danger, #dc3545);
}
.load-more-error p {
  margin: 0;
  flex: 1;
}
.load-more-error button {
  padding: 4px 8px;
  background: var(--color-danger, #dc3545);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm, 4px);
  cursor: pointer;
  font-size: var(--font-size-xs, 0.75rem);
}
</style>
