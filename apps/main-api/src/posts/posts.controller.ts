import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
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
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { SearchPostDto } from './dto/search-post.dto';
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

  @Get('my/liked')
  @ApiOperation({ summary: 'Get paginated list of posts liked by current user' })
  @ApiOkResponse({ description: 'Paginated list of liked posts' })
  async findMyLikedPosts(@CurrentUserId() userId: string, @Query() query: PaginationQueryDto) {
    return this.postsService.findMyLikedPosts(userId, query);
  }

  @Get('feed')
  @ApiOperation({ summary: 'Get user feed based on follows' })
  @ApiOkResponse({ description: 'Paginated feed posts' })
  async getFeed(@CurrentUserId() userId: string, @Query() query: PaginationQueryDto) {
    return this.postsService.getFeed(userId, query);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search posts by content query' })
  @ApiOkResponse({ description: 'Paginated search results' })
  async search(@CurrentUserId() userId: string, @Query() searchDto: SearchPostDto) {
    return this.postsService.search(userId, searchDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single post by id' })
  @ApiParam({ name: 'id', description: 'Post ID' })
  @ApiOkResponse({ description: 'Post details' })
  @ApiNotFoundResponse({ description: 'Post not found' })
  async findOnePost(@Param('id') id: string, @CurrentUserId() userId: string) {
    return this.postsService.findOne(id, userId);
  }

  @Get(':id/likes')
  @ApiOperation({ summary: 'Get paginated list of users who liked the post' })
  @ApiParam({ name: 'id', description: 'Post ID' })
  @ApiOkResponse({ description: 'Paginated list of users who liked the post' })
  async getPostLikes(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.postsService.getPostLikes(id, userId, query);
  }

  @Post(':id/like')
  @ApiOperation({ summary: 'Like a post by id' })
  @ApiParam({ name: 'id', description: 'Post ID' })
  @ApiOkResponse({ description: 'Post liked successfully' })
  async likePost(@Param('id') id: string, @CurrentUserId() userId: string) {
    return this.postsService.likePost(id, userId);
  }

  @Delete(':id/like')
  @ApiOperation({ summary: 'Unlike a post by id' })
  @ApiParam({ name: 'id', description: 'Post ID' })
  @ApiOkResponse({ description: 'Post unliked successfully' })
  async unlikePost(@Param('id') id: string, @CurrentUserId() userId: string) {
    return this.postsService.unlikePost(id, userId);
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
