import type { User, InsertUser } from '../../shared/schema';

/** Storage boundary for web/session authentication. */
export interface AuthStore {
  getUser(id:number):Promise<User|undefined>;
  getUserByEmail(email:string):Promise<User|undefined>;
  createUser(input:InsertUser):Promise<User>;
  updateUserResetToken(id:number,hash:string,expiresAt:Date):Promise<void>;
  getUserByResetToken(hash:string):Promise<User|undefined>;
  updateUserPassword(id:number,passwordHash:string):Promise<void>;
  consumePasswordReset(id:number,tokenHash:string,passwordHash:string,now:Date):Promise<boolean>;
}
