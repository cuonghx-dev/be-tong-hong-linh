import type { BookLockDto } from '@app/shared'
import { BadRequestException, Injectable } from '@nestjs/common'
import { PrismaService } from '../../database/prisma.service'
import { SetBookLockDto } from './dto/set-book-lock.dto'

// Khóa sổ kỳ kế toán (docs/tech.md): chứng từ có ngày hạch toán ≤ ngày khóa sổ
// không được thêm/sửa/xóa. Lưu 1 dòng duy nhất (id = 1) trong book_locks.
@Injectable()
export class BookLockService {
  constructor(private readonly prisma: PrismaService) {}

  async get(): Promise<BookLockDto> {
    const lock = await this.prisma.bookLock.findUnique({ where: { id: 1 } })
    return { lockDate: lock ? toIsoDate(lock.lockDate) : null }
  }

  async set(dto: SetBookLockDto): Promise<BookLockDto> {
    const lockDate = new Date(dto.lockDate)
    const lock = await this.prisma.bookLock.upsert({
      where: { id: 1 },
      create: { id: 1, lockDate },
      update: { lockDate },
    })
    return { lockDate: toIsoDate(lock.lockDate) }
  }

  async clear(): Promise<BookLockDto> {
    await this.prisma.bookLock.deleteMany()
    return { lockDate: null }
  }

  /** Ngày khóa sổ hiện tại (null = chưa khóa) — dùng cho nhập khẩu lọc dòng bị khóa. */
  async getLockDate(): Promise<Date | null> {
    const lock = await this.prisma.bookLock.findUnique({ where: { id: 1 } })
    return lock?.lockDate ?? null
  }

  /**
   * Chặn ghi vào kỳ đã khóa sổ: ném lỗi nếu có ngày hạch toán ≤ ngày khóa sổ.
   * Bỏ qua phần tử undefined (update DTO là PartialType nên postingDate có thể thiếu).
   */
  async assertUnlocked(...dates: (Date | string | undefined)[]): Promise<void> {
    const lockDate = await this.getLockDate()
    if (!lockDate) return
    const locked = dates.some((d) => d !== undefined && new Date(d) <= lockDate)
    if (locked) {
      throw new BadRequestException(
        `Đã khóa sổ đến ngày ${formatVn(lockDate)}. Không thể thêm/sửa/xóa chứng từ có ngày hạch toán trong kỳ đã khóa.`,
      )
    }
  }
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function formatVn(d: Date): string {
  const iso = toIsoDate(d)
  const [y, m, day] = iso.split('-')
  return `${day}/${m}/${y}`
}
