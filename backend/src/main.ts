import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './modules/common/filters/http-exception.filter';
import { AllExceptionsFilter } from './modules/common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './modules/common/interceptors/logging.interceptor';

/**
 * 应用启动入口
 * 配置全局管道、Swagger文档等
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // 全局日志拦截器 - 记录所有请求
  app.useGlobalInterceptors(new LoggingInterceptor());

  // 全局异常过滤器
  app.useGlobalFilters(new AllExceptionsFilter(), new HttpExceptionFilter());

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
    .setDescription(
      `LLM驱动的手机端UI自动化定位系统 - API文档
    
    ## Iteration 1 - 遍历指挥调度核心
    本迭代实现了核心的任务调度和LLM指令生成功能：
    - ✅ 遍历任务创建与管理（FR-01）
    - ✅ Orchestrator 状态机调度（FR-02）
    - ✅ LLM 指令生成与安全控制（FR-03/04）
    
    ## 技术栈
    - NestJS + TypeScript + Prisma
    - PostgreSQL 数据库
    - Qwen3-VL 多模态大模型（Mock）
    - Appium + MidSceneJS（集成中）
    `,
    )
    .setVersion('1.0.0-iteration1')
    .addTag('Health', '健康检查')
    .addTag('Devices', '设备管理')
    .addTag('Apps', '应用与版本管理')
    .addTag('Tasks', '遍历任务管理（Iteration 1 - FR-01）')
    .addTag('Orchestrator', '调度器管理（Iteration 1 - FR-02）')
    .addTag('LLM', 'LLM 指令生成（Iteration 1 - FR-03/04）')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // 端口配置：直接使用固定端口 8360；如需自定义，请修改此常量
  const port = 8360;
  await app.listen(port);

  console.log(`\n✅ Maestro Backend Started Successfully!`);
  console.log(`🚀 Server: http://localhost:${port}`);
  console.log(`📚 API Docs: http://localhost:${port}/api/docs`);
  console.log(`💚 Health Check: http://localhost:${port}${apiPrefix}/health`);
  console.log(`\n📦 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️  Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
}

bootstrap();
