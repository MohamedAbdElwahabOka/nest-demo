import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendOtpDto {
  @ApiProperty({
    example: '+201234567890',
    description: 'Phone number in E.164 format (e.g., +201234567890)',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+[1-9]\d{6,14}$/, {
    message: 'Phone number must be in E.164 format (e.g., +201234567890)',
  })
  phone: string;

  @ApiProperty({
    example: 'Mohamed Ahmed',
    description: 'Full name of the user',
  })
  @IsString()
  @IsNotEmpty()
  name: string;
}
