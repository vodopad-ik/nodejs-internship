import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ description: 'The email of the user' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ description: 'The password of the user', minLength: 6, maxLength: 20 })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(20)
  password!: string;

  @ApiProperty({ description: 'The unique username of the user' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(20)
  username!: string;
}
