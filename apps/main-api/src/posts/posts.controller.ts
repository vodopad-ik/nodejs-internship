import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { AccessGuard } from '../auth/guards/access.guard';
import { CurrentUserId } from '../common/decorators/current-user-id.decorator';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostsService } from './posts.service';

@ApiTags('posts')
@ApiBearerAuth()
@UseGuards(AccessGuard)
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new post with media assets' })
  @ApiCreatedResponse({ description: 'Post created successfully' })
  @ApiForbiddenResponse({ description: 'Unauthorized or forbidden' })
  async createPost(@CurrentUserId() userId: string, @Body() dto: CreatePostDto) {
    return this.postsService.create(userId, dto);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get all active posts of current user' })
  @ApiOkResponse({ description: 'List of active posts of current user' })
  async findMyPosts(@CurrentUserId() userId: string) {
    return this.postsService.findMyPosts(userId);
  }

  @Get('my/archived')
  @ApiOperation({ summary: 'Get all archived posts of current user' })
  @ApiOkResponse({ description: 'List of archived posts of current user' })
  async findMyArchivedPosts(@CurrentUserId() userId: string) {
    return this.postsService.findMyArchivedPosts(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get post by id' })
  @ApiParam({ name: 'id', description: 'Post ID' })
  @ApiOkResponse({ description: 'Post found successfully' })
  @ApiNotFoundResponse({ description: 'Post not found or is archived' })
  async findOnePost(@Param('id') id: string, @CurrentUserId() currentUserId?: string) {
    return this.postsService.findOne(id, currentUserId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update post content and assets' })
  @ApiParam({ name: 'id', description: 'Post ID' })
  @ApiOkResponse({ description: 'Post updated successfully' })
  @ApiForbiddenResponse({ description: 'You are not allowed to modify this post' })
  @ApiNotFoundResponse({ description: 'Post not found' })
  async updatePost(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
    @Body() dto: UpdatePostDto,
  ) {
    return this.postsService.update(id, userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete post by id' })
  @ApiParam({ name: 'id', description: 'Post ID' })
  @ApiOkResponse({ description: 'Post deleted successfully' })
  @ApiForbiddenResponse({ description: 'You are not allowed to modify this post' })
  @ApiNotFoundResponse({ description: 'Post not found' })
  async removePost(@Param('id') id: string, @CurrentUserId() userId: string) {
    return this.postsService.remove(id, userId);
  }

  @Patch(':id/archive')
  @ApiOperation({ summary: 'Archive post by id' })
  @ApiParam({ name: 'id', description: 'Post ID' })
  @ApiOkResponse({ description: 'Post archived successfully' })
  @ApiForbiddenResponse({ description: 'You are not allowed to modify this post' })
  @ApiNotFoundResponse({ description: 'Post not found' })
  async archivePost(@Param('id') id: string, @CurrentUserId() userId: string) {
    return this.postsService.archivePost(id, userId);
  }
}
