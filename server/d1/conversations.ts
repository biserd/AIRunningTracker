import type {AtomicSqlDatabase} from './jobStore';
import {positiveId} from './activityPolicy';

type Conversation={id:number;user_id:number;title:string|null;created_at:string|null;updated_at:string|null};
type Message={id:number;conversation_id:number;role:'user'|'assistant';content:string;feedback:string|null;created_at:string|null};

/** Every operation derives ownership from the authenticated runner, including mutation statements. */
export class D1Conversations {
  constructor(private db:AtomicSqlDatabase){}
  async get(runnerId:number,id:number){
    return this.db.prepare('SELECT * FROM ai_conversations WHERE id=? AND user_id=?')
      .bind(positiveId(id),positiveId(runnerId)).first<Conversation>();
  }
  async list(runnerId:number,limit=20){
    if(!Number.isInteger(limit)||limit<1||limit>100)throw new Error('INVALID_PAGE_LIMIT');
    return (await this.db.prepare('SELECT * FROM ai_conversations WHERE user_id=? ORDER BY updated_at DESC,id DESC LIMIT ?')
      .bind(positiveId(runnerId),limit).all<Conversation>()).results;
  }
  async create(runnerId:number,title:string|null=null){
    if(title!==null&&title.length>200)throw new Error('TITLE_TOO_LONG');
    return this.db.prepare('INSERT INTO ai_conversations(user_id,title) VALUES(?,?) RETURNING *')
      .bind(positiveId(runnerId),title).first<Conversation>();
  }
  async addMessage(runnerId:number,conversationId:number,role:'user'|'assistant',content:string){
    if(!['user','assistant'].includes(role)||!content||new TextEncoder().encode(content).byteLength>64_000)throw new Error('INVALID_MESSAGE');
    // The ownership predicate and write execute atomically. No preflight/read race.
    return this.db.prepare(`INSERT INTO ai_messages(conversation_id,role,content)
      SELECT id,?,? FROM ai_conversations WHERE id=? AND user_id=? RETURNING *`)
      .bind(role,content,positiveId(conversationId),positiveId(runnerId)).first<Message>();
  }
  async messages(runnerId:number,conversationId:number,limit=50){
    if(!Number.isInteger(limit)||limit<1||limit>100)throw new Error('INVALID_PAGE_LIMIT');
    return (await this.db.prepare(`SELECT m.* FROM ai_messages m JOIN ai_conversations c ON c.id=m.conversation_id
      WHERE c.id=? AND c.user_id=? ORDER BY m.created_at,m.id LIMIT ?`)
      .bind(positiveId(conversationId),positiveId(runnerId),limit).all<Message>()).results;
  }
  async remove(runnerId:number,conversationId:number){
    positiveId(runnerId);positiveId(conversationId);
    const results=await this.db.batch([
      this.db.prepare(`DELETE FROM ai_messages WHERE conversation_id IN
        (SELECT id FROM ai_conversations WHERE id=? AND user_id=?)`).bind(conversationId,runnerId),
      this.db.prepare('DELETE FROM ai_conversations WHERE id=? AND user_id=?').bind(conversationId,runnerId),
    ]);
    return results[1].meta.changes===1;
  }
}
