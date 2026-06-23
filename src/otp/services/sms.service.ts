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

  async sendTwilioOtp(phone: string, code: string): Promise<void> {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    const twilioPhone = this.configService.get<string>('TWILIO_PHONE_NUMBER');

    if (!accountSid || !authToken || !twilioPhone) {
      this.logger.error('Twilio configuration is incomplete (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_PHONE_NUMBER is missing)');
      throw new InternalServerErrorException('Twilio SMS service is not properly configured');
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    // Twilio expects phone number in E.164 format (with the '+' prefix)
    const body = new URLSearchParams();
    body.append('To', phone);
    body.append('From', twilioPhone);
    body.append('Body', `Your verification code is: ${code}. It expires in 5 minutes.`);

    // Basic Auth header
    const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    try {
      this.logger.log(`Sending SMS to ${phone} via Twilio`);
      const response = await firstValueFrom(
        this.httpService.post(url, body.toString(), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: authHeader,
          },
        }),
      );
      this.logger.log(`SMS OTP sent successfully via Twilio. SID: ${response.data?.sid}`);
    } catch (error) {
      const axiosError = error as AxiosError;
      this.logger.error(
        `Failed to send SMS via Twilio: ${JSON.stringify(axiosError.response?.data || axiosError.message)}`,
      );
      throw new InternalServerErrorException(
        `Failed to send OTP via Twilio: ${(axiosError.response?.data as any)?.message || axiosError.message}`,
      );
    }
  }

  async sendVonageOtp(phone: string, code: string): Promise<void> {
    const apiKey = this.configService.get<string>('VONAGE_API_KEY');
    const apiSecret = this.configService.get<string>('VONAGE_API_SECRET');
    const brandName = this.configService.get<string>('VONAGE_BRAND_NAME') || 'NestDemo';

    if (!apiKey || !apiSecret) {
      this.logger.error('Vonage configuration is incomplete (VONAGE_API_KEY or VONAGE_API_SECRET is missing)');
      throw new InternalServerErrorException('Vonage SMS service is not properly configured');
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

      this.logger.log(`SMS OTP sent successfully via Vonage. Message ID: ${messageStatus['message-id']}`);
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }
      const axiosError = error as AxiosError;
      this.logger.error(
        `Failed to send SMS via Vonage: ${JSON.stringify(axiosError.response?.data || axiosError.message)}`,
      );
      throw new InternalServerErrorException(`Failed to send OTP via Vonage: ${axiosError.message}`);
    }
  }
}
