import {randomUUID} from 'node:crypto';
import {SignedDataVerifier,Environment,type JWSTransactionDecodedPayload} from '@apple/app-store-server-library';
import type {AtomicSqlDatabase} from '../d1/jobStore';
import {APPLE_ROOTS_BASE64} from './appleRoots';
export const APPLE_PRODUCTS=['run.aitracker.coach.premium.monthly','run.aitracker.coach.premium.annual'] as const;
const bundle='run.aitracker.coach';
export class AppleSubscriptionLedger {
  constructor(private db:AtomicSqlDatabase){}
  async accountToken(user:number){
    await this.db.prepare('INSERT INTO apple_purchase_accounts(user_id,app_account_token,created_at) VALUES(?,?,?) ON CONFLICT(user_id) DO NOTHING').bind(user,randomUUID(),Date.now()).run();
    const row=await this.db.prepare('SELECT app_account_token FROM apple_purchase_accounts WHERE user_id=?').bind(user).first<{app_account_token:string}>();
    if(!row)throw new Error('APPLE_ACCOUNT_UNAVAILABLE');
    return row.app_account_token;
  }
  async record(transaction:JWSTransactionDecodedPayload,expectedUser?:number){
    if(transaction.bundleId!==bundle||!APPLE_PRODUCTS.includes(transaction.productId as typeof APPLE_PRODUCTS[number])||!['Production','Sandbox'].includes(transaction.environment??'')||!transaction.appAccountToken||!transaction.originalTransactionId||!transaction.transactionId||!Number.isSafeInteger(transaction.expiresDate)||!Number.isSafeInteger(transaction.signedDate))throw new Error('INVALID_APPLE_TRANSACTION');
    const account=await this.db.prepare('SELECT user_id FROM apple_purchase_accounts WHERE app_account_token=?').bind(transaction.appAccountToken).first<{user_id:number}>();
    if(!account||(expectedUser!==undefined&&expectedUser!==account.user_id))throw new Error('APPLE_ACCOUNT_MISMATCH');
    const prior=await this.db.prepare('SELECT user_id FROM apple_subscriptions WHERE original_transaction_id=? AND environment=?').bind(transaction.originalTransactionId,transaction.environment!).first<{user_id:number}>();
    if(prior&&prior.user_id!==account.user_id)throw new Error('APPLE_ACCOUNT_MISMATCH');
    await this.db.prepare(`INSERT INTO apple_subscriptions(original_transaction_id,environment,user_id,product_id,transaction_id,expires_at,revoked_at,signed_at) VALUES(?,?,?,?,?,?,?,?)
      ON CONFLICT(original_transaction_id,environment) DO UPDATE SET product_id=excluded.product_id,transaction_id=excluded.transaction_id,expires_at=excluded.expires_at,revoked_at=excluded.revoked_at,signed_at=excluded.signed_at
      WHERE apple_subscriptions.user_id=excluded.user_id AND apple_subscriptions.signed_at<excluded.signed_at`)
      .bind(transaction.originalTransactionId,transaction.environment!,account.user_id,transaction.productId!,transaction.transactionId,transaction.expiresDate!,transaction.revocationDate??null,transaction.signedDate!).run();
    return account.user_id;
  }
  async access(user:number,environment:'Production'|'Sandbox'='Production'){
    return this.db.prepare('SELECT product_id,expires_at,environment FROM apple_subscriptions WHERE user_id=? AND environment=? AND expires_at>? AND revoked_at IS NULL ORDER BY expires_at DESC LIMIT 1')
      .bind(user,environment,Date.now()).first<{product_id:string;expires_at:number;environment:string}>();
  }
}
export function appleVerifier(environment:Environment){
  const roots=APPLE_ROOTS_BASE64.split(',').map(x=>Buffer.from(x,'base64'));
  if(!roots.length)throw new Error('APPLE_VERIFICATION_NOT_CONFIGURED');
  return new SignedDataVerifier(roots,true,environment,bundle,6813680941);
}
export async function verifyAppleTransaction(signed:string){
  if(signed.length>30000)throw new Error('INVALID_APPLE_TRANSACTION');
  try{return await appleVerifier(Environment.PRODUCTION).verifyAndDecodeTransaction(signed);}
  catch(error){
    if(process.env.APPLE_SUBSCRIPTIONS_ALLOW_SANDBOX!=='true')throw error;
    return appleVerifier(Environment.SANDBOX).verifyAndDecodeTransaction(signed);
  }
}
/** Verify the envelope and nested transaction separately. Never trust decoded JWS alone. */
export async function receiveAppleNotification(db:AtomicSqlDatabase,signed:string){
  if(signed.length>60000)throw new Error('INVALID_APPLE_NOTIFICATION');
  let verifier=appleVerifier(Environment.PRODUCTION);
  let notification;
  try {notification=await verifier.verifyAndDecodeNotification(signed);}
  catch(error){
    if(process.env.APPLE_SUBSCRIPTIONS_ALLOW_SANDBOX!=='true')throw error;
    verifier=appleVerifier(Environment.SANDBOX);
    notification=await verifier.verifyAndDecodeNotification(signed);
  }
  if(!notification.notificationUUID)throw new Error('INVALID_APPLE_NOTIFICATION');
  if(await db.prepare('SELECT notification_id FROM apple_subscription_events WHERE notification_id=?').bind(notification.notificationUUID).first())return;
  const environment=notification.data?.environment;
  if(environment!=='Sandbox'&&environment!=='Production')throw new Error('INVALID_APPLE_ENVIRONMENT');
  if(notification.data?.signedTransactionInfo){
    const transaction=await verifier.verifyAndDecodeTransaction(notification.data.signedTransactionInfo);
    if(transaction.environment!==environment)throw new Error('INVALID_APPLE_ENVIRONMENT');
    await new AppleSubscriptionLedger(db).record(transaction);
  }else if(notification.notificationType!=='TEST'){
    throw new Error('MISSING_APPLE_TRANSACTION');
  }
  // Write deduplication only after persistence succeeds; a crash safely replays the upsert.
  await db.prepare('INSERT INTO apple_subscription_events(notification_id,environment,received_at) VALUES(?,?,?) ON CONFLICT(notification_id) DO NOTHING').bind(notification.notificationUUID,environment,Date.now()).run();
}
