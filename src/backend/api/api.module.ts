import { Module } from '@nestjs/common';
import { ApiService } from './api.service';
import { cmsKernelProvider, currentUserProvider } from './cms-kernel.provider';
import { ContentController } from './content.controller';
import { GraphQlController } from './graphql.controller';
import { ResourcesController } from './resources.controller';

@Module({
  controllers: [ContentController, ResourcesController, GraphQlController],
  providers: [cmsKernelProvider, currentUserProvider, ApiService],
})
export class ApiModule {}
