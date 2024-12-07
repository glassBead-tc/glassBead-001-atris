import Redis from 'ioredis';
import { Messages } from '@langchain/langgraph';
import { GraphState } from '../types.js';

export class RedisService {
  private redis: Redis;
  private readonly ttl: number = 60 * 60 * 24; // 24 hours

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  private getThreadKey(threadId: string): string {
    return `thread:${threadId}`;
  }

  private getStateKey(threadId: string): string {
    return `state:${threadId}`;
  }

  async saveMessages(threadId: string, messages: Messages): Promise<void> {
    const key = this.getThreadKey(threadId);
    await this.redis.setex(
      key,
      this.ttl,
      JSON.stringify(messages)
    );
  }

  async getMessages(threadId: string): Promise<Messages | null> {
    const key = this.getThreadKey(threadId);
    const messages = await this.redis.get(key);
    return messages ? JSON.parse(messages) : null;
  }

  async saveState(threadId: string, state: Partial<GraphState>): Promise<void> {
    const key = this.getStateKey(threadId);
    await this.redis.setex(
      key,
      this.ttl,
      JSON.stringify(state)
    );
  }

  async getState(threadId: string): Promise<Partial<GraphState> | null> {
    const key = this.getStateKey(threadId);
    const state = await this.redis.get(key);
    return state ? JSON.parse(state) : null;
  }

  async deleteThread(threadId: string): Promise<void> {
    const messageKey = this.getThreadKey(threadId);
    const stateKey = this.getStateKey(threadId);
    await Promise.all([
      this.redis.del(messageKey),
      this.redis.del(stateKey)
    ]);
  }
}

export const redisService = new RedisService();
