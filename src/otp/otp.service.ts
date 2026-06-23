import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { WhatsappService } from './services/whatsapp.service';
import { SmsService } from './services/sms.service';
import { OtpChannel } from '@prisma/client';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly whatsappService: WhatsappService,
    private readonly smsService: SmsService,
  ) {}

  async sendOtpViaWhatsapp(dto: SendOtpDto) {
    const code = this.generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiration

    await this.cleanupExpiredOtps(dto.phone);

    await this.prisma.otpVerification.create({
      data: {
        phone: dto.phone,
        name: dto.name,
        code,
        channel: OtpChannel.WHATSAPP,
        expiresAt,
      },
    });

    await this.whatsappService.sendOtp(dto.phone, code, dto.name);

    return {
      message: 'OTP sent successfully via WhatsApp',
      expiresInSeconds: 300,
    };
  }

  async sendOtpViaTwilio(dto: SendOtpDto) {
    const code = this.generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiration

    await this.cleanupExpiredOtps(dto.phone);

    await this.prisma.otpVerification.create({
      data: {
        phone: dto.phone,
        name: dto.name,
        code,
        channel: OtpChannel.SMS,
        expiresAt,
      },
    });

    await this.smsService.sendTwilioOtp(dto.phone, code);

    return {
      message: 'OTP sent successfully via Twilio',
      expiresInSeconds: 300,
    };
  }

  async sendOtpViaVonage(dto: SendOtpDto) {
    const code = this.generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiration

    await this.cleanupExpiredOtps(dto.phone);

    await this.prisma.otpVerification.create({
      data: {
        phone: dto.phone,
        name: dto.name,
        code,
        channel: OtpChannel.SMS,
        expiresAt,
      },
    });

    await this.smsService.sendVonageOtp(dto.phone, code);

    return {
      message: 'OTP sent successfully via Vonage',
      expiresInSeconds: 300,
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    // Find the latest unverified OTP verification record for this phone and code
    const verification = await this.prisma.otpVerification.findFirst({
      where: {
        phone: dto.phone,
        code: dto.code,
        verified: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!verification) {
      this.logger.warn(`OTP verification failed: Code not found or already verified for phone ${dto.phone}`);
      throw new NotFoundException('Invalid OTP code');
    }

    if (verification.expiresAt < new Date()) {
      this.logger.warn(`OTP verification failed: Code expired for phone ${dto.phone}`);
      throw new BadRequestException('OTP code has expired');
    }

    // Process verification in a transaction:
    // Mark OTP as verified, upsert User, and clean up OTPs for this phone
    const user = await this.prisma.$transaction(async (tx) => {
      // Mark current verification as verified
      await tx.otpVerification.update({
        where: { id: verification.id },
        data: { verified: true },
      });

      // Find user by phone
      let userRecord = await tx.user.findUnique({
        where: { phone: dto.phone },
      });

      if (!userRecord) {
        this.logger.log(`Creating new user for phone number ${dto.phone}`);
        userRecord = await tx.user.create({
          data: {
            phone: dto.phone,
            name: verification.name,
            role: 'USER',
          },
        });
      }

      // Cleanup all OTP records for this phone number
      await tx.otpVerification.deleteMany({
        where: { phone: dto.phone },
      });

      return userRecord;
    });

    // Generate JWT token
    const payload = { sub: user.id, phone: user.phone, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  private generateOtp(): string {
    const otpVal = Math.floor(100000 + Math.random() * 900000);
    return otpVal.toString();
  }

  private async cleanupExpiredOtps(phone: string): Promise<void> {
    try {
      await this.prisma.otpVerification.deleteMany({
        where: {
          OR: [
            { phone },
            { expiresAt: { lt: new Date() } },
          ],
        },
      });
    } catch (error) {
      this.logger.error(`Error cleaning up OTPs: ${error.message}`);
    }
  }
}
