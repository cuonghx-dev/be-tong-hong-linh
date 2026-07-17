-- Thêm vai trò Thủ quỹ + Giám đốc (viewer) vào enum UserRole.
-- Lưu ý: ALTER TYPE ... ADD VALUE không dùng được giá trị mới trong cùng transaction (PG),
-- nhưng migration này chỉ thêm giá trị nên an toàn.
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'THUQUY';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'VIEWER';
