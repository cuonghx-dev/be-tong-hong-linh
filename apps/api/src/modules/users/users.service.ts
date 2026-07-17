import type { UserListItem } from '@app/shared'
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import type { User } from '@prisma/client'
import { hash } from 'bcryptjs'
import { PrismaService } from '../../database/prisma.service'
import type { CreateUserDto } from './dto/create-user.dto'
import type { UpdateUserDto } from './dto/update-user.dto'

const BCRYPT_ROUNDS = 10

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<UserListItem[]> {
    const users = await this.prisma.user.findMany({ orderBy: { createdAt: 'asc' } })
    return users.map((u) => this.toListItem(u))
  }

  async create(dto: CreateUserDto): Promise<UserListItem> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } })
    if (existing) throw new ConflictException('Email đã được sử dụng')
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        role: dto.role,
        passwordHash: await hash(dto.password, BCRYPT_ROUNDS),
      },
    })
    return this.toListItem(user)
  }

  // Sửa name/role/isActive, đổi mật khẩu (optional). Không hard delete — khóa bằng isActive.
  async update(id: string, dto: UpdateUserDto, currentUserId: string): Promise<UserListItem> {
    const user = await this.prisma.user.findUnique({ where: { id } })
    if (!user) throw new NotFoundException('Người dùng không tồn tại')

    // Chặn tự khóa / tự đổi vai trò chính mình — tránh khóa nhầm tài khoản admin duy nhất.
    if (id === currentUserId) {
      if (dto.isActive === false) {
        throw new BadRequestException('Không thể tự khóa tài khoản của chính mình')
      }
      if (dto.role && dto.role !== user.role) {
        throw new BadRequestException('Không thể tự đổi vai trò của chính mình')
      }
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name,
        role: dto.role,
        isActive: dto.isActive,
        passwordHash: dto.password ? await hash(dto.password, BCRYPT_ROUNDS) : undefined,
      },
    })
    return this.toListItem(updated)
  }

  // Không bao giờ trả passwordHash ra ngoài.
  private toListItem(user: User): UserListItem {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserListItem['role'],
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
    }
  }
}
