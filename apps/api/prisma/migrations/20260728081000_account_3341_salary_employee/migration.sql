-- TK 3341 "Phải trả công nhân viên" (con của 334) — TK Nợ mặc định của
-- phiếu chi "Trả lương tạm ứng cho nhân viên" (theo form MISA).
INSERT INTO "accounts" ("id", "number", "name", "nature", "parent_id", "is_active", "created_at", "updated_at")
SELECT gen_random_uuid(), '3341', 'Phải trả công nhân viên', 'CREDIT',
       (SELECT "id" FROM "accounts" WHERE "number" = '334'),
       true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "accounts" WHERE "number" = '3341');
