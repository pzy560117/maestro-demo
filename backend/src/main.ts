import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './modules/common/filters/http-exception.filter';
import { AllExceptionsFilter } from './modules/common/filters/all-exceptions.filter';

/**
 * 应用启动入口
 * 配置全局管道、Swagger文档等
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // 全局异常过滤器
  app.useGlobalFilters(
    new AllExceptionsFilter(),
    new HttpExceptionFilter(),
  );

  // 全局验证管道 - 遵循参数校验规范
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // 自动过滤非DTO字段
      forbidNonWhitelisted: true, // 存在非白名单字段时抛出错误
      transform: true, // 自动类型转换
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // 配置CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  });

  // 配置API前缀
  const apiPrefix = process.env.API_PREFIX || '/api/v1';
  app.setGlobalPrefix(apiPrefix);

  // Swagger文档配置 - 遵循API文档规范
  const config = new DocumentBuilder()
    .setTitle('Maestro API')
    .setDescription('LLM驱动的手机端UI自动化定位系统 - API文档')
    .setVersion('0.1.0')
    .addTag('health', '健康检查')
    .addTag('devices', '设备管理')
    .addTag('apps', '应用版本管理')
    .addTag('tasks', '遍历任务管理（Iteration 1）')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`\n✅ Maestro Backend Started Successfully!`);
  console.log(`🚀 Server: http://localhost:${port}`);
  console.log(`📚 API Docs: http://localhost:${port}/api/docs`);
  console.log(`💚 Health Check: http://localhost:${port}${apiPrefix}/health`);
  console.log(`\n📦 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️  Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
}

bootstrap();

