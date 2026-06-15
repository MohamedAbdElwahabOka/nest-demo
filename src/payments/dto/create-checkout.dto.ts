import { IsNumber, IsString, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCheckoutDto {
  @ApiProperty({ example: 1000, description: 'Amount in cents (e.g., 1000 = $10.00)', minimum: 100 })
  @IsNumber()
  @Min(100) // Minimum 100 cents = $1.00
  amount: number;

  @ApiPropertyOptional({ example: 'usd', default: 'usd', description: 'Currency code' })
  @IsString()
  @IsOptional()
  currency?: string = 'usd';
}
