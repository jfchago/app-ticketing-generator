import type { ActivityLog } from '../../domain/activityLog/activityLog.types';

import type { ActivityLogRepository } from '../../domain/activityLog/activityLog.repository';
import { apiClient } from '../api-client';

export class ActivityLogRepositoryImpl implements ActivityLogRepository {
  async getById(id: string): Promise<ActivityLog> {
    const { data: responseData } = await apiClient.get<ActivityLog>(`/activity-logs/${id}`);
    return responseData;
  }
}
