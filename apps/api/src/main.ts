import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { Logger } from 'nestjs-pino'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true })

  // Payload ghi theo lô (số dư công nợ hàng nghìn đối tượng…) vượt limit json
  // mặc định 100kb của Express → 413 "request entity too large".
  app.useBodyParser('json', { limit: '5mb' })

  app.useLogger(app.get(Logger))
  app.setGlobalPrefix('api')
  app.enableCors()
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  )

  const config = new DocumentBuilder()
    .setTitle('Kế toán SME API')
    .setDescription('API phần mềm kế toán online cho SME')
    .setVersion('0.1')
    .addBearerAuth()
    .build()
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config))

  const port = process.env.API_PORT ?? 3000
  await app.listen(port)
}

void bootstrap()
