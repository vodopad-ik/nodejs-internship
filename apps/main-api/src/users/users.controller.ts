import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { User } from '@prisma/client';
import { AccessGuard } from '../auth/guards/access.guard';
import { ERROR_MESSAGES } from '../common/constants/messages.constants';
import { CurrentUserId } from '../common/decorators/current-user-id.decorator';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(AccessGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiOkResponse({ description: 'List of users with profiles' })
  async findAll(): Promise<User[]> {
    return this.usersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by id' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiOkResponse({ description: 'User details with profile' })
  @ApiNotFoundResponse({ description: 'User not found' })
  async findOne(@Param('id') id: string): Promise<User> {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update own user profile' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiOkResponse({ description: 'User profile updated successfully' })
  @ApiForbiddenResponse({ description: 'You are not allowed to modify this user' })
  @ApiNotFoundResponse({ description: 'User not found' })
  async update(
    @Param('id') id: string,
    @CurrentUserId() currentUserId: string,
    @Body() dto: UpdateUserDto,
  ): Promise<User> {
    if (id !== currentUserId) {
      throw new ForbiddenException(ERROR_MESSAGES.NOT_ALLOWED_TO_MODIFY_USER);
    }
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete own user account' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiOkResponse({ description: 'User deleted successfully' })
  @ApiForbiddenResponse({ description: 'You are not allowed to modify this user' })
  @ApiNotFoundResponse({ description: 'User not found' })
  async remove(@Param('id') id: string, @CurrentUserId() currentUserId: string): Promise<User> {
    if (id !== currentUserId) {
      throw new ForbiddenException(ERROR_MESSAGES.NOT_ALLOWED_TO_MODIFY_USER);
    }
    return this.usersService.remove(id);
  }
}
