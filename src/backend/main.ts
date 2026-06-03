import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DEFAULT_HEADLESS_CONFIG } from '../main';
import { AppModule } from './app.module';
import { loadDotEnv } from './env';

loadDotEnv();

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const origins = DEFAULT_HEADLESS_CONFIG.corsOrigins;

  app.enableCors({
    origin: origins.includes('*') ? true : origins,
    credentials: origins.includes('*') ? false : true,
  });

  const adminDistPath = join(process.cwd(), 'frontend/admin/dist');
  if (existsSync(adminDistPath)) {
    app.useStaticAssets(adminDistPath, { prefix: DEFAULT_HEADLESS_CONFIG.adminClientPath });
  }

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
