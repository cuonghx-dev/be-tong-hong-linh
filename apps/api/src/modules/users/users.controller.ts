import type { UserListItem } from '@app/shared'
import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { CurrentUser, type RequestUser } from '../../common/decorators/current-user.decorator'
import { Domain } from '../../common/decorators/domain.decorator'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { UsersService } from './users.service'

// Quản lý người dùng — domain 'users' chỉ ADMIN có quyền (ROLE_PERMISSIONS).
@ApiTags('users')
@ApiBearerAuth()
@Domain('users')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách người dùng' })
  list(): Promise<UserListItem[]> {
    return this.users.list()
  }

  @Post()
  @ApiOperation({ summary: 'Tạo người dùng mới' })
  create(@Body() dto: CreateUserDto): Promise<UserListItem> {
    return this.users.create(dto)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Sửa người dùng (tên, vai trò, khóa/mở, đổi mật khẩu)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: RequestUser,
  ): Promise<UserListItem> {
    return this.users.update(id, dto, user.userId)
  }
}
