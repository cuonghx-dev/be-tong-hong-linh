// DTO khóa sổ kỳ kế toán — chứng từ có ngày hạch toán ≤ lockDate không được thêm/sửa/xóa.

export interface BookLockDto {
  /** Ngày khóa sổ (YYYY-MM-DD); null = chưa khóa sổ. */
  lockDate: string | null
}

export interface SetBookLockDto {
  /** Ngày khóa sổ mới (YYYY-MM-DD). */
  lockDate: string
}
