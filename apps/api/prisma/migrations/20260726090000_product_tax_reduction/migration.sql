-- Giảm thuế theo quy định (cột "Giảm thuế theo quy định" trên danh mục VTHH của MISA).
ALTER TABLE "products" ADD COLUMN "tax_reduction" TEXT;
