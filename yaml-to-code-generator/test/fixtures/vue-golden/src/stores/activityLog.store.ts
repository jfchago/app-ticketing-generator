import { defineStore } from 'pinia';
import type { ActivityLog } from '../domain/activityLog/activityLog.types';



import { ActivityLogService } from '../domain/activityLog/activityLog.service';
import { ActivityLogRepositoryImpl } from '../infrastructure/repositories/activityLog.repository.impl';

const service = new ActivityLogService(new ActivityLogRepositoryImpl());




interface ActivityLogState {
  activityLogs: ActivityLog[];
  current: ActivityLog | null;
  loading: boolean;
  error: string | null;

}

export const useActivityLogStore = defineStore('activityLog', {
  state: (): ActivityLogState => ({
    activityLogs: [],
    current: null,
    loading: false,
    error: null
  }),

  actions: {

    async getById(id: string) {
      this.loading = true; this.error = null;
        try { this.current = await service.getById(id); }
        catch (e) { this.error = e instanceof Error ? e.message : 'Error loading activityLog'; }
        finally { this.loading = false; }
    },


  }
});
