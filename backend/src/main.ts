import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:4200',
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Lytex Payment App')
    .setDescription('API de cobranças integrada à Lytex (sandbox)')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  const logFormat = process.env.LOG_FORMAT ?? 'text';
  new Logger('Bootstrap').log(
    `http://localhost:${port} | Swagger /docs | HTTP logs [HTTP] | LOG_FORMAT=${logFormat} | LOG_TO_DB=${process.env.LOG_TO_DB ?? 'true'}`,
  );
}
bootstrap();
