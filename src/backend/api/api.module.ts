import { Module } from '@nestjs/common';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { ApiService } from './api.service';
import { cmsKernelProvider, currentUserProvider } from './cms-kernel.provider';
import { ContentController } from './content.controller';
import { GraphQlController } from './graphql.controller';
import { ResourcesController } from './resources.controller';

@Module({
  controllers: [AuthController, ContentController, ResourcesController, GraphQlController],
  providers: [cmsKernelProvider, currentUserProvider, ApiService, AuthService],
})
export class ApiModule {}
