import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BlogsService } from './blogs.service';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { PaginationDto } from '../users/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@ApiTags('Blogs')
@Controller('blogs')
export class BlogsController {
  constructor(private blogsService: BlogsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all blogs (Public)' })
  @ApiResponse({ status: 200, description: 'List of blog posts with pagination.' })
  findAll(@Query() pagination: PaginationDto) {
    return this.blogsService.findAll(pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single blog by ID (Public)' })
  @ApiResponse({ status: 200, description: 'Blog post details.' })
  @ApiResponse({ status: 404, description: 'Blog post not found.' })
  findOne(@Param('id') id: string) {
    return this.blogsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard) // Only logged-in users can create blogs
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new blog post' })
  @ApiResponse({ status: 201, description: 'Blog created successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  create(
    @Body() dto: CreateBlogDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.blogsService.create(dto, user.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard) // Only logged-in users can update blogs
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a blog post by ID' })
  @ApiResponse({ status: 200, description: 'Blog updated successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden (Not the author or admin).' })
  @ApiResponse({ status: 404, description: 'Blog post not found.' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBlogDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    const isAdmin = user.role === Role.ADMIN;
    return this.blogsService.update(id, dto, user.id, isAdmin);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard) // Only logged-in users can delete blogs
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a blog post by ID' })
  @ApiResponse({ status: 200, description: 'Blog deleted successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden (Not the author or admin).' })
  @ApiResponse({ status: 404, description: 'Blog post not found.' })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    const isAdmin = user.role === Role.ADMIN;
    return this.blogsService.remove(id, user.id, isAdmin);
  }
}
