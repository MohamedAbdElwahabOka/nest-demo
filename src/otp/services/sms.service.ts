import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  async sendOtp(phone: string, code: string): Promise<void> {
    const apiKey = this.configService.get<string>('VONAGE_API_KEY');
    const apiSecret = this.configService.get<string>('VONAGE_API_SECRET');
    const brandName = this.configService.get<string>('VONAGE_BRAND_NAME') || 'NestDemo';

    if (!apiKey || !apiSecret) {
      this.logger.error('Vonage configuration is incomplete (VONAGE_API_KEY or VONAGE_API_SECRET is missing)');
      throw new InternalServerErrorException('SMS service is not properly configured');
    }

    const url = 'https://rest.nexmo.com/sms/json';

    // Vonage expects E.164 without the '+' prefix
    const formattedPhone = phone.replace('+', '');

    const payload = {
      api_key: apiKey,
      api_secret: apiSecret,
      to: formattedPhone,
      from: brandName,
      text: `Your verification code is: ${code}. It expires in 5 minutes.`,
    };

    try {
      this.logger.log(`Sending SMS to ${formattedPhone} via Vonage`);
      const response = await firstValueFrom(this.httpService.post(url, payload));

      const messageStatus = response.data?.messages?.[0];
      if (messageStatus && messageStatus.status !== '0') {
        this.logger.error(`Vonage API error response: ${JSON.stringify(response.data)}`);
        throw new InternalServerErrorException(
          `Vonage error: ${messageStatus['error-text'] || 'Unknown error occurred'}`,
        );
      }

      this.logger.log(`SMS OTP sent successfully. Message ID: ${messageStatus['message-id']}`);
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }
      const axiosError = error as AxiosError;
      this.logger.error(
        `Failed to send SMS message: ${JSON.stringify(axiosError.response?.data || axiosError.message)}`,
      );
      throw new InternalServerErrorException(`Failed to send OTP via SMS: ${axiosError.message}`);
    }
  }
}
