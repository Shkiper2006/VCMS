import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { ApiModule } from './api/api.module';

@Module({
  imports: [ApiModule],
  controllers: [AdminController],
})
export class AppModule {}
