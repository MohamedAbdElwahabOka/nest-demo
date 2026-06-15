import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // Enable CORS
  app.enableCors();

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('NestJS Demo API')
    .setDescription('Auth, Users, Blogs, and Payments API')
    .setVersion('1.0')
    .addBearerAuth() // Adds JWT Authentication option to Swagger UI
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document); // Swagger UI will be available at /api/docs

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
