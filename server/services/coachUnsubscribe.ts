import {createHmac,timingSafeEqual} from 'node:crypto';
import {getUnsubscribeTokenSecret} from '../config/security';
export function coachUnsubscribeToken(user:number,secret=getUnsubscribeTokenSecret()){
 if(!Number.isSafeInteger(user)||user<1)throw new Error('Invalid account');
 return user+'.'+createHmac('sha256',secret).update('coach-notifications:'+user).digest('hex');
}
export function verifyCoachUnsubscribe(token:unknown,secret=getUnsubscribeTokenSecret()):number|null{
 if(typeof token!=='string'||!/^\d{1,12}\.[a-f0-9]{64}$/.test(token))return null;
 const user=Number(token.split('.')[0]);if(!Number.isSafeInteger(user)||user<1)return null;
 const expected=coachUnsubscribeToken(user,secret);
 return expected.length===token.length&&timingSafeEqual(Buffer.from(token),Buffer.from(expected))?user:null;
}
