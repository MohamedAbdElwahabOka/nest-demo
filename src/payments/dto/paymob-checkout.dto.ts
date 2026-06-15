import { IsNumber, IsString, Min } from 'class-validator';

export class PaymobCheckoutDto {
  @IsNumber()
  @Min(100)
  amountCents: number;

  @IsString()
  email: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  phone: string;
}
