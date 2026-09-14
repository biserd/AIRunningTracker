import {applicationSqlDatabase} from './runtimeDatabase';
import {D1JobStore} from './jobStore';
import {D1BillingWebhookDelivery} from './billingWebhookDelivery';
import {runAsD1SchedulerLeader} from './schedulerLeadership';
import {isMigrationStaging} from '../config/runtime';

export const createJobStore=()=>isMigrationStaging()?null:new D1JobStore(applicationSqlDatabase);
export const createBillingWebhookStore=()=>new D1BillingWebhookDelivery(applicationSqlDatabase);
export const startRuntimeScheduler=(start:()=>Promise<void>)=>runAsD1SchedulerLeader(applicationSqlDatabase,start);
