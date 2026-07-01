// activityLog.repository.ts — Generated from helpdesk.yaml
import type { ActivityLog } from './activityLog.types';

export interface ActivityLogRepository {
  getById(id: string): Promise<ActivityLog>;
}
