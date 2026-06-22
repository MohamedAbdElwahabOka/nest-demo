import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { OtpController } from './otp.controller';
import { OtpService } from './otp.service';
import { WhatsappService } from './services/whatsapp.service';
import { SmsService } from './services/sms.service';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
    }),
  ],
  controllers: [OtpController],
  providers: [OtpService, WhatsappService, SmsService],
})
export class OtpModule {}
