import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { OtpService } from './otp.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@ApiTags('OTP Auth')
@Controller('auth')
export class OtpController {
  constructor(private readonly otpService: OtpService) {}

  @Post('send-otp/whatsapp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send OTP verification code via WhatsApp' })
  @ApiResponse({ status: 200, description: 'OTP successfully sent via WhatsApp.' })
  @ApiResponse({ status: 400, description: 'Invalid input parameters.' })
  @ApiResponse({ status: 500, description: 'Meta API call failure.' })
  sendOtpWhatsapp(@Body() dto: SendOtpDto) {
    return this.otpService.sendOtpViaWhatsapp(dto);
  }

  @Post('send-otp/sms')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send OTP verification code via SMS (Vonage)' })
  @ApiResponse({ status: 200, description: 'OTP successfully sent via SMS.' })
  @ApiResponse({ status: 400, description: 'Invalid input parameters.' })
  @ApiResponse({ status: 500, description: 'Vonage API call failure.' })
  sendOtpSms(@Body() dto: SendOtpDto) {
    return this.otpService.sendOtpViaSms(dto);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP code and return JWT access token' })
  @ApiResponse({ status: 200, description: 'OTP verified. Returns JWT access token.' })
  @ApiResponse({ status: 400, description: 'OTP code has expired.' })
  @ApiResponse({ status: 404, description: 'Invalid OTP code.' })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.otpService.verifyOtp(dto);
  }
}
