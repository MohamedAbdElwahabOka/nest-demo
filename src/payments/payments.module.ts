import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { StripeService } from './stripe.service';
import { PaymobService } from './paymob.service';

@Module({
  controllers: [PaymentsController],
  providers: [StripeService, PaymobService],
})
export class PaymentsModule {}
