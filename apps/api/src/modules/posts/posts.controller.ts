import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { PostsService } from './posts.service';
import { CreatePostDto, UpdatePostDto } from './dto';

@ApiTags('posts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workspaces/:workspaceId/posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new post' })
  async create(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreatePostDto,
    @Request() req: any,
  ) {
    return this.postsService.create(workspaceId, req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List posts in workspace' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(
    @Param('workspaceId') workspaceId: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.postsService.findAll(workspaceId, {
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get post by ID' })
  async findOne(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.postsService.findOne(workspaceId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a post' })
  async update(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePostDto,
  ) {
    return this.postsService.update(workspaceId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a post' })
  async remove(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.postsService.remove(workspaceId, id);
  }

  @Post(':id/schedule')
  @ApiOperation({ summary: 'Schedule a post for publishing' })
  async schedule(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body('scheduledAt') scheduledAt: string,
  ) {
    return this.postsService.schedule(workspaceId, id, new Date(scheduledAt));
  }
}
