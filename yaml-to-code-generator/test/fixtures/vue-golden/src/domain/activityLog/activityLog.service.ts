

import type { ActivityLog } from './activityLog.types';



import type { ActivityLogRepository } from './activityLog.repository';

export interface ActivityLogServiceHooks {



  beforeGetById?(id: string): Promise<void> | void;

  afterGetById?(result: ActivityLog): Promise<void> | void;


}

export class ActivityLogService {
  repository: ActivityLogRepository;
  private readonly hooks?: Partial<ActivityLogServiceHooks>;

  constructor(repository: ActivityLogRepository, hooks?: Partial<ActivityLogServiceHooks>) {
    this.repository = repository;
    this.hooks = hooks;
  }







  async getById(id: string): Promise<ActivityLog> {
    try { await this.hooks?.beforeGetById?.(id); } catch {}

    const result = await this.repository.getById(id);
    try { await this.hooks?.afterGetById?.(result); } catch {}
    return result;

  }


}
