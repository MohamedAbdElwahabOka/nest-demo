import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { BlogsService } from './blogs.service';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { PaginationDto } from '../users/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('blogs')
export class BlogsController {
  constructor(private blogsService: BlogsService) {}

  @Get()
  findAll(@Query() pagination: PaginationDto) {
    return this.blogsService.findAll(pagination);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.blogsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard) // Only logged-in users can create blogs
  create(
    @Body() dto: CreateBlogDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.blogsService.create(dto, user.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard) // Only logged-in users can update blogs
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
  remove(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    const isAdmin = user.role === Role.ADMIN;
    return this.blogsService.remove(id, user.id, isAdmin);
  }
}
