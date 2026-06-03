import { Body, Controller, Post } from '@nestjs/common';
import { ApiService } from './api.service';

interface GraphQlContentBody {
  type?: string;
}

@Controller()
export class GraphQlController {
  constructor(private readonly api: ApiService) {}

  @Post('graphql')
  query(@Body() body: GraphQlContentBody = {}) {
    return this.api.queryGraphQl(body.type);
  }
}
