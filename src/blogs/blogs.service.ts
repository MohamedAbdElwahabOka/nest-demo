import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { PaginationDto } from '../users/dto/pagination.dto';

@Injectable()
export class BlogsService {
  constructor(private prisma: PrismaService) {}

  async findAll(pagination: PaginationDto) {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const [blogs, total] = await Promise.all([
      this.prisma.blog.findMany({
        skip,
        take: limit,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.blog.count(),
    ]);

    return {
      data: blogs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const blog = await this.prisma.blog.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    if (!blog) throw new NotFoundException('Blog not found');
    return blog;
  }

  async create(dto: CreateBlogDto, authorId: string) {
    return this.prisma.blog.create({
      data: {
        title: dto.title,
        content: dto.content,
        published: dto.published ?? false,
        authorId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async update(id: string, dto: UpdateBlogDto, userId: string, isAdmin: boolean) {
    const blog = await this.findOne(id);

    // Authorization check: Only the author or an admin can update
    if (blog.authorId !== userId && !isAdmin) {
      throw new ForbiddenException('You do not have permission to update this blog');
    }

    return this.prisma.blog.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string, userId: string, isAdmin: boolean) {
    const blog = await this.findOne(id);

    // Authorization check: Only the author or an admin can delete
    if (blog.authorId !== userId && !isAdmin) {
      throw new ForbiddenException('You do not have permission to delete this blog');
    }

    await this.prisma.blog.delete({
      where: { id },
    });

    return { message: 'Blog deleted successfully' };
  }
}
