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
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@ApiTags('comments')
@ApiBearerAuth()
@UseGuards(AccessGuard)
@Controller()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post('posts/:postId/comments')
  @ApiOperation({ summary: 'Create a comment or reply on a post' })
  @ApiParam({ name: 'postId', description: 'Post ID' })
  @ApiCreatedResponse({ description: 'Comment created successfully' })
  @ApiForbiddenResponse({ description: 'Profile is private' })
  @ApiNotFoundResponse({ description: 'Post or parent comment not found' })
  async create(
    @Param('postId') postId: string,
    @CurrentUserId() userId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentsService.create(postId, userId, dto);
  }

  @Get('posts/:postId/comments')
  @ApiOperation({ summary: 'Get paginated top-level comments for a post' })
  @ApiParam({ name: 'postId', description: 'Post ID' })
  @ApiOkResponse({ description: 'Paginated list of top-level comments' })
  @ApiForbiddenResponse({ description: 'Profile is private' })
  @ApiNotFoundResponse({ description: 'Post not found' })
  async findByPost(
    @Param('postId') postId: string,
    @CurrentUserId() userId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.commentsService.findByPost(postId, userId, query);
  }

  @Get('comments/:id/replies')
  @ApiOperation({ summary: 'Get paginated replies for a comment' })
  @ApiParam({ name: 'id', description: 'Comment ID' })
  @ApiOkResponse({ description: 'Paginated list of comment replies' })
  @ApiForbiddenResponse({ description: 'Profile is private' })
  @ApiNotFoundResponse({ description: 'Comment or post not found' })
  async findReplies(
    @Param('id') commentId: string,
    @CurrentUserId() userId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.commentsService.findReplies(commentId, userId, query);
  }

  @Patch('comments/:id')
  @ApiOperation({ summary: 'Update own comment content' })
  @ApiParam({ name: 'id', description: 'Comment ID' })
  @ApiOkResponse({ description: 'Comment updated successfully' })
  @ApiForbiddenResponse({ description: 'You are not allowed to modify this comment' })
  @ApiNotFoundResponse({ description: 'Comment not found' })
  async update(
    @Param('id') commentId: string,
    @CurrentUserId() userId: string,
    @Body() dto: UpdateCommentDto,
  ) {
    return this.commentsService.update(commentId, userId, dto);
  }

  @Delete('comments/:id')
  @ApiOperation({ summary: 'Delete own comment' })
  @ApiParam({ name: 'id', description: 'Comment ID' })
  @ApiOkResponse({ description: 'Comment deleted successfully' })
  @ApiForbiddenResponse({ description: 'You are not allowed to modify this comment' })
  @ApiNotFoundResponse({ description: 'Comment not found' })
  async remove(@Param('id') commentId: string, @CurrentUserId() userId: string) {
    return this.commentsService.remove(commentId, userId);
  }

  @Post('comments/:id/like')
  @ApiOperation({ summary: 'Like a comment by id' })
  @ApiParam({ name: 'id', description: 'Comment ID' })
  @ApiOkResponse({ description: 'Comment liked successfully' })
  @ApiForbiddenResponse({ description: 'Profile is private' })
  @ApiNotFoundResponse({ description: 'Comment or post not found' })
  async likeComment(@Param('id') commentId: string, @CurrentUserId() userId: string) {
    return this.commentsService.likeComment(commentId, userId);
  }

  @Delete('comments/:id/like')
  @ApiOperation({ summary: 'Unlike a comment by id' })
  @ApiParam({ name: 'id', description: 'Comment ID' })
  @ApiOkResponse({ description: 'Comment unliked successfully' })
  @ApiNotFoundResponse({ description: 'Comment like not found' })
  async unlikeComment(@Param('id') commentId: string, @CurrentUserId() userId: string) {
    return this.commentsService.unlikeComment(commentId, userId);
  }

  @Get('comments/:id/likes')
  @ApiOperation({ summary: 'Get paginated list of users who liked the comment' })
  @ApiParam({ name: 'id', description: 'Comment ID' })
  @ApiOkResponse({ description: 'Paginated list of users who liked the comment' })
  @ApiForbiddenResponse({ description: 'Profile is private' })
  @ApiNotFoundResponse({ description: 'Comment or post not found' })
  async getCommentLikes(
    @Param('id') commentId: string,
    @CurrentUserId() userId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.commentsService.getCommentLikes(commentId, userId, query);
  }
}
