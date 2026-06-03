import { Controller, Get, Res } from '@nestjs/common';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Response } from 'express';
import { DEFAULT_HEADLESS_CONFIG } from '../main';

@Controller()
export class AdminController {
  private readonly indexFile = join(process.cwd(), 'frontend/admin/dist/index.html');

  @Get([DEFAULT_HEADLESS_CONFIG.adminClientPath.slice(1), `${DEFAULT_HEADLESS_CONFIG.adminClientPath.slice(1)}/*`])
  serveAdmin(@Res() response: Response) {
    if (existsSync(this.indexFile)) {
      return response.sendFile(this.indexFile);
    }

    return response.status(503).json({
      message: 'Admin build is not available. Run npm run build:admin or use npm run dev:admin with the Vite proxy.',
    });
  }
}
