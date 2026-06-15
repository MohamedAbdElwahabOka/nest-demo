import { IsNumber, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PaymobCheckoutDto {
  @ApiProperty({ example: 10000, description: 'Amount in cents (e.g., 10000 = 100 EGP)', minimum: 100 })
  @IsNumber()
  @Min(100)
  amountCents: number;

  @ApiProperty({ example: 'user@example.com', description: 'Customer email' })
  @IsString()
  email: string;

  @ApiProperty({ example: 'Mohamed', description: 'Customer first name' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Oka', description: 'Customer last name' })
  @IsString()
  lastName: string;

  @ApiProperty({ example: '+201012345678', description: 'Customer phone number' })
  @IsString()
  phone: string;
}
