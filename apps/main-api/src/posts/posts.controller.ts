import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
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
  async createPost(@CurrentUserId() userId: string, @Body() dto: CreatePostDto) {
    return this.postsService.create(userId, dto);
  }

  @Get('my')
  async findMyPosts(@CurrentUserId() userId: string) {
    return this.postsService.findMyPosts(userId);
  }

  @Get(':id')
  async findOnePost(@Param('id') id: string, @CurrentUserId() currentUserId?: string) {
    return this.postsService.findOne(id, currentUserId);
  }

  @Patch(':id')
  async updatePost(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
    @Body() dto: UpdatePostDto,
  ) {
    return this.postsService.update(id, userId, dto);
  }

  @Delete(':id')
  async removePost(@Param('id') id: string, @CurrentUserId() userId: string) {
    return this.postsService.remove(id, userId);
  }

  @Patch(':id/archive')
  async archivePost(@Param('id') id: string, @CurrentUserId() userId: string) {
    return this.postsService.toggleArchive(id, userId);
  }
}
