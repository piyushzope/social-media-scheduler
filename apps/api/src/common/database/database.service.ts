import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@social/database';

@Injectable()
export class DatabaseService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    console.log('[DatabaseService] Connecting to database...');
    console.log('[DatabaseService] DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
    await this.$connect();
    console.log('[DatabaseService] Connected successfully');

    // Test the connection
    const count = await this.user.count();
    console.log('[DatabaseService] Current user count:', count);
  }

  async onModuleDestroy() {
    console.log('[DatabaseService] Disconnecting from database...');
    await this.$disconnect();
  }
}
