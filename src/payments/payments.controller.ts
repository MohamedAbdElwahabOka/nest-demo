import {
  Controller, Post, Body, Headers, Req, Query, Get,
  UseGuards, BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { StripeService } from './stripe.service';
import { PaymobService } from './paymob.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { PaymobCheckoutDto } from './dto/paymob-checkout.dto';
import { Role } from '@prisma/client';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private stripeService: StripeService,
    private paymobService: PaymobService,
    private prisma: PrismaService,
  ) {}

  // ────── Stripe Checkout & Webhook ──────

  @Post('stripe/checkout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a Stripe Checkout Session' })
  @ApiResponse({ status: 201, description: 'Returns Stripe checkout URL.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async stripeCheckout(
    @Body() dto: CreateCheckoutDto,
    @CurrentUser() user: { id: string },
  ) {
    const session = await this.stripeService.createCheckoutSession({
      amount: dto.amount,
      currency: dto.currency || 'usd',
      userId: user.id,
      successUrl: 'http://localhost:4000/payments/success',
      cancelUrl: 'http://localhost:4000/payments/cancel',
    });

    // Save PENDING payment record
    await this.prisma.payment.create({
      data: {
        amount: dto.amount,
        currency: dto.currency || 'usd',
        status: 'PENDING',
        provider: 'STRIPE',
        providerOrderId: session.id,
        userId: user.id,
      },
    });

    return { checkoutUrl: session.url, sessionId: session.id };
  }

  @Post('stripe/webhook')
  @ApiOperation({ summary: 'Stripe Webhook Endpoint (Do not call manually)' })
  async stripeWebhook(
    @Req() req: any,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    try {
      const event = this.stripeService.constructWebhookEvent(
        req.rawBody!,
        signature,
      );

      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object;
          console.log('✅ Stripe Payment successful for session:', session.id);
          await this.prisma.payment.updateMany({
            where: { providerOrderId: session.id, provider: 'STRIPE' },
            data: { status: 'COMPLETED' },
          });
          break;
        }
        case 'checkout.session.expired': {
          const session = event.data.object;
          console.log('❌ Stripe Payment session expired:', session.id);
          await this.prisma.payment.updateMany({
            where: { providerOrderId: session.id, provider: 'STRIPE' },
            data: { status: 'FAILED' },
          });
          break;
        }
        default:
          console.log(`Unhandled Stripe event type: ${event.type}`);
      }

      return { received: true };
    } catch (err: any) {
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }
  }

  // ────── PayMob Checkout & Webhook ──────

  @Post('paymob/checkout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a PayMob Checkout Iframe URL' })
  @ApiResponse({ status: 201, description: 'Returns PayMob iframe URL.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async paymobCheckout(
    @Body() dto: PaymobCheckoutDto,
    @CurrentUser() user: { id: string },
  ) {
    // Step 1: Authenticate with API key
    const token = await this.paymobService.getAuthToken();

    // Step 2: Register the order transaction
    const order = await this.paymobService.createOrder(token, dto.amountCents);

    // Step 3: Register the PENDING payment in our database
    await this.prisma.payment.create({
      data: {
        amount: dto.amountCents,
        currency: 'egp',
        status: 'PENDING',
        provider: 'PAYMOB',
        providerOrderId: String(order.id),
        userId: user.id,
      },
    });

    // Step 4: Request the payment key for charge
    const paymentKey = await this.paymobService.getPaymentKey({
      token,
      orderId: order.id,
      amountCents: dto.amountCents,
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
    });

    return {
      paymentKey,
      iframeUrl: `https://accept.paymob.com/api/acceptance/iframes/${process.env.PAYMOB_IFRAME_ID}?payment_token=${paymentKey}`,
    };
  }

  @Post('paymob/webhook')
  @ApiOperation({ summary: 'PayMob Webhook Endpoint (Do not call manually)' })
  async paymobWebhook(@Body() body: any, @Query('hmac') hmac: string) {
    if (!hmac) {
      throw new BadRequestException('Missing hmac signature query parameter');
    }

    const isValid = this.paymobService.verifyWebhookHmac(body.obj, hmac);

    if (!isValid) {
      throw new BadRequestException('Invalid HMAC signature');
    }

    const orderId = body.obj.order?.id ? String(body.obj.order.id) : String(body.obj.order);

    if (body.obj.success === true) {
      console.log('✅ PayMob payment successful for order ID:', orderId);
      await this.prisma.payment.updateMany({
        where: { providerOrderId: orderId, provider: 'PAYMOB' },
        data: { status: 'COMPLETED' },
      });
    } else {
      console.log('❌ PayMob payment failed for order ID:', orderId);
      await this.prisma.payment.updateMany({
        where: { providerOrderId: orderId, provider: 'PAYMOB' },
        data: { status: 'FAILED' },
      });
    }

    return { received: true };
  }

  // ────── Query / List Payments ──────

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all payments for the logged-in user' })
  @ApiResponse({ status: 200, description: 'Returns user payments.' })
  async getMyPayments(@CurrentUser() user: { id: string }) {
    return this.prisma.payment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all payments (Admin only)' })
  @ApiResponse({ status: 200, description: 'Returns all payments in the system.' })
  async getAllPayments() {
    return this.prisma.payment.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
