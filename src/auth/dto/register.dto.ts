import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com', description: 'The email address of the user' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', minLength: 6, description: 'User password (minimum 6 characters)' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'John Doe', description: 'The full name of the user' })
  @IsString()
  @IsNotEmpty()
  name: string;
}
