import { IsNumber, IsString, IsOptional, Min } from 'class-validator';

export class CreateCheckoutDto {
  @IsNumber()
  @Min(100) // Minimum 100 cents = $1.00
  amount: number;

  @IsString()
  @IsOptional()
  currency?: string = 'usd';
}
