import {pool} from './db';
import {DurableJobStore} from './services/queue/durableJobStore';
import {PostgresBillingWebhookDelivery} from './services/postgresBillingWebhookDelivery';
import {isCloudflareRuntime,isMigrationStaging} from './config/runtime';
import {runAsSchedulerLeader} from './services/schedulerLeadership';

export const createJobStore=()=>isCloudflareRuntime()&&!isMigrationStaging()?new DurableJobStore(pool):null;
export const createBillingWebhookStore=()=>new PostgresBillingWebhookDelivery(pool);
export const startRuntimeScheduler=(start:()=>Promise<void>)=>runAsSchedulerLeader(pool,start);
