import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  async sendOtp(phone: string, code: string, name: string): Promise<void> {
    const apiVersion = 'v22.0';
    const phoneNumberId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID');
    const accessToken = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN');
    const templateName = this.configService.get<string>('WHATSAPP_TEMPLATE_NAME') || 'hello_world';

    if (!phoneNumberId || !accessToken) {
      this.logger.error('WhatsApp configuration is incomplete (WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN is missing)');
      throw new InternalServerErrorException('WhatsApp service is not properly configured');
    }

    const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

    // Remove '+' for WhatsApp E.164 without leading plus
    const formattedPhone = phone.replace('+', '');

    const payload: any = {
      messaging_product: 'whatsapp',
      to: formattedPhone,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: 'en_US', // English (US) matches the default sample templates
        },
      },
    };

    // Construct parameters based on the template used
    if (templateName === 'jaspers_market_order_confirmation_v1') {
      payload.template.components = [
        {
          type: 'body',
          parameters: [
            {
              type: 'text',
              text: name, // {{1}} - User Name
            },
            {
              type: 'text',
              text: code, // {{2}} - Order number (used for OTP)
            },
            {
              type: 'text',
              text: '5 minutes', // {{3}} - Estimated delivery (expires in 5 minutes)
            },
          ],
        },
      ];
      this.logger.log(`Using jaspers_market_order_confirmation_v1 template. Sending parameters: Name=${name}, Code=${code}`);
    } else if (templateName !== 'hello_world') {
      payload.template.components = [
        {
          type: 'body',
          parameters: [
            {
              type: 'text',
              text: code,
            },
          ],
        },
      ];
    } else {
      this.logger.log(`[POC WORKAROUND] Using hello_world template. The recipient will receive 'Hello World'. Your generated OTP code is: ${code}`);
    }

    try {
      this.logger.log(`Sending WhatsApp template message to ${formattedPhone} using template ${templateName}`);
      const response = await firstValueFrom(
        this.httpService.post(url, payload, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }),
      );
      this.logger.log(`WhatsApp OTP sent successfully. Message ID: ${response.data?.messages?.[0]?.id}`);
    } catch (error) {
      const axiosError = error as AxiosError;
      this.logger.error(
        `Failed to send WhatsApp message: ${JSON.stringify(axiosError.response?.data || axiosError.message)}`,
      );
      throw new InternalServerErrorException(
        `Failed to send OTP via WhatsApp: ${
          (axiosError.response?.data as any)?.error?.message || axiosError.message
        }`,
      );
    }
  }
}
