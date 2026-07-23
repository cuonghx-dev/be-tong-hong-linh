-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'KETOAN', 'THUQUY', 'VIEWER');

-- CreateEnum
CREATE TYPE "CashVoucherType" AS ENUM ('RECEIPT', 'PAYMENT');

-- CreateEnum
CREATE TYPE "CashVoucherCategory" AS ENUM ('SALES_CASH', 'RECEIPT', 'PAYMENT_EMPLOYEE_ADVANCE', 'PAYMENT_PURCHASE_WITH_INVOICE', 'DEPOSIT_TO_BANK', 'PAYMENT', 'PURCHASE_SERVICE_CASH', 'PURCHASE_GOODS_CASH');

-- CreateEnum
CREATE TYPE "PartnerType" AS ENUM ('CUSTOMER', 'SUPPLIER', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "BankVoucherType" AS ENUM ('RECEIPT', 'PAYMENT');

-- CreateEnum
CREATE TYPE "BankVoucherCategory" AS ENUM ('RECEIPT', 'INTERNAL_TRANSFER', 'PAYMENT');

-- CreateEnum
CREATE TYPE "BankPaymentMethod" AS ENUM ('UNC', 'TRANSFER', 'CHECK');

-- CreateEnum
CREATE TYPE "PurchaseVoucherType" AS ENUM ('STOCK', 'NON_STOCK', 'SERVICE');

-- CreateEnum
CREATE TYPE "PurchaseOrigin" AS ENUM ('DOMESTIC');

-- CreateEnum
CREATE TYPE "PurchasePaymentMode" AS ENUM ('UNPAID', 'IMMEDIATE');

-- CreateEnum
CREATE TYPE "PurchaseReceiveStatus" AS ENUM ('NOT_RECEIVED', 'RECEIVED');

-- CreateEnum
CREATE TYPE "PurchasePaymentStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID');

-- CreateEnum
CREATE TYPE "SupplierType" AS ENUM ('ORG', 'INDIVIDUAL');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "InventoryReceiptType" AS ENUM ('PURCHASE', 'FINISHED_GOODS');

-- CreateEnum
CREATE TYPE "GoodsIssueCategory" AS ENUM ('SALES', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "SalesVoucherType" AS ENUM ('DOMESTIC_GOODS');

-- CreateEnum
CREATE TYPE "SalesPaymentMode" AS ENUM ('UNPAID', 'PAID_NOW');

-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('ORG', 'INDIVIDUAL');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('GOODS', 'SERVICE', 'FINISHED', 'MATERIAL', 'TOOL');

-- CreateEnum
CREATE TYPE "AccountNature" AS ENUM ('DEBIT', 'CREDIT', 'DUAL');

-- CreateEnum
CREATE TYPE "CostObjectType" AS ENUM ('PRODUCT', 'WORKSHOP', 'OTHER');

-- CreateEnum
CREATE TYPE "IncomeExpenseType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "TransferSide" AS ENUM ('DEBIT', 'CREDIT', 'BOTH');

-- CreateEnum
CREATE TYPE "OrgUnitLevel" AS ENUM ('COMPANY', 'BRANCH', 'DEPARTMENT');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'KETOAN',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_vouchers" (
    "id" TEXT NOT NULL,
    "type" "CashVoucherType" NOT NULL,
    "category" "CashVoucherCategory" NOT NULL,
    "voucher_no" TEXT NOT NULL,
    "posting_date" DATE NOT NULL,
    "voucher_date" DATE NOT NULL,
    "partner_type" "PartnerType",
    "partner_id" TEXT,
    "partner_name" TEXT,
    "payer_receiver" TEXT,
    "address" TEXT,
    "employee_id" TEXT,
    "reason" TEXT,
    "attachment_count" INTEGER NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "branch_id" TEXT,
    "posted" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "cash_vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_voucher_lines" (
    "id" TEXT NOT NULL,
    "voucher_id" TEXT NOT NULL,
    "line_no" INTEGER NOT NULL,
    "description" TEXT,
    "debit_account" TEXT NOT NULL,
    "credit_account" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "operation" TEXT,
    "partner_id" TEXT,
    "partner_name" TEXT,
    "cost_item_id" TEXT,
    "bank_account_no" TEXT,
    "bank_name" TEXT,

    CONSTRAINT "cash_voucher_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_vouchers" (
    "id" TEXT NOT NULL,
    "type" "BankVoucherType" NOT NULL,
    "category" "BankVoucherCategory" NOT NULL,
    "voucher_no" TEXT NOT NULL,
    "payment_method" "BankPaymentMethod",
    "is_batch_transfer" BOOLEAN NOT NULL DEFAULT false,
    "internal_ref" TEXT,
    "posting_date" DATE NOT NULL,
    "voucher_date" DATE NOT NULL,
    "bank_account_no" TEXT,
    "bank_name" TEXT,
    "receiver_account_no" TEXT,
    "partner_type" "PartnerType",
    "partner_id" TEXT,
    "partner_name" TEXT,
    "address" TEXT,
    "employee_id" TEXT,
    "reason" TEXT,
    "reference" TEXT,
    "attachment_count" INTEGER NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "branch_id" TEXT,
    "posted" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "bank_vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_voucher_lines" (
    "id" TEXT NOT NULL,
    "voucher_id" TEXT NOT NULL,
    "line_no" INTEGER NOT NULL,
    "description" TEXT,
    "debit_account" TEXT NOT NULL,
    "credit_account" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "partner_id" TEXT,
    "partner_name" TEXT,

    CONSTRAINT "bank_voucher_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SupplierType" NOT NULL DEFAULT 'ORG',
    "is_customer" BOOLEAN NOT NULL DEFAULT false,
    "tax_code" TEXT,
    "budget_relation_code" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "address" TEXT,
    "group_id" TEXT,
    "employee_id" TEXT,
    "is_internal" BOOLEAN NOT NULL DEFAULT false,
    "debt_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "invoice_risk" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_vouchers" (
    "id" TEXT NOT NULL,
    "type" "PurchaseVoucherType" NOT NULL,
    "origin" "PurchaseOrigin" NOT NULL DEFAULT 'DOMESTIC',
    "payment_mode" "PurchasePaymentMode" NOT NULL DEFAULT 'UNPAID',
    "receive_with_invoice" BOOLEAN NOT NULL DEFAULT false,
    "voucher_no" TEXT NOT NULL,
    "invoice_no" TEXT,
    "posting_date" DATE NOT NULL,
    "voucher_date" DATE NOT NULL,
    "supplier_id" TEXT,
    "supplier_name" TEXT,
    "deliverer" TEXT,
    "address" TEXT,
    "employee_id" TEXT,
    "description" TEXT,
    "attachment_count" INTEGER NOT NULL DEFAULT 0,
    "contract_no" TEXT,
    "payment_term_id" TEXT,
    "credit_days" INTEGER,
    "due_date" DATE,
    "total_goods" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total_vat" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total_payment" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "purchase_cost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "stock_value" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "einvoice_lookup_code" TEXT,
    "einvoice_lookup_url" TEXT,
    "payment_id" TEXT,
    "receipt_id" TEXT,
    "receive_status" "PurchaseReceiveStatus" NOT NULL DEFAULT 'NOT_RECEIVED',
    "payment_status" "PurchasePaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "posted" BOOLEAN NOT NULL DEFAULT true,
    "branch_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "purchase_vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_voucher_lines" (
    "id" TEXT NOT NULL,
    "voucher_id" TEXT NOT NULL,
    "line_no" INTEGER NOT NULL,
    "item_id" TEXT,
    "item_name" TEXT,
    "warehouse_id" TEXT,
    "stock_account" TEXT,
    "payable_account" TEXT NOT NULL,
    "unit" TEXT,
    "quantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "unit_price" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "vat_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "vat_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "vat_account" TEXT NOT NULL,

    CONSTRAINT "purchase_voucher_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_receipts" (
    "id" TEXT NOT NULL,
    "receipt_type" "InventoryReceiptType" NOT NULL DEFAULT 'PURCHASE',
    "voucher_no" TEXT NOT NULL,
    "posting_date" DATE NOT NULL,
    "voucher_date" DATE NOT NULL,
    "partner_id" TEXT,
    "partner_name" TEXT,
    "address" TEXT,
    "deliverer" TEXT,
    "description" TEXT,
    "reference" TEXT,
    "attachment_count" INTEGER NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "branch_name" TEXT,
    "posted" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "inventory_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_receipt_lines" (
    "id" TEXT NOT NULL,
    "receipt_id" TEXT NOT NULL,
    "line_no" INTEGER NOT NULL,
    "item_id" TEXT,
    "item_name" TEXT,
    "warehouse_id" TEXT,
    "debit_account" TEXT,
    "credit_account" TEXT,
    "unit" TEXT,
    "quantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "unit_price" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "lot_no" TEXT,
    "expiry_date" DATE,

    CONSTRAINT "inventory_receipt_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goods_issue_vouchers" (
    "id" TEXT NOT NULL,
    "category" "GoodsIssueCategory" NOT NULL DEFAULT 'SALES',
    "voucher_no" TEXT NOT NULL,
    "posting_date" DATE NOT NULL,
    "voucher_date" DATE NOT NULL,
    "customer_id" TEXT,
    "customer_name" TEXT,
    "receiver" TEXT,
    "address" TEXT,
    "sales_employee_id" TEXT,
    "description" TEXT,
    "attachment_count" INTEGER NOT NULL DEFAULT 0,
    "delivery_location" TEXT,
    "total_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "sales_doc_status" TEXT,
    "invoice_issue_status" TEXT,
    "tax_authority_code" TEXT,
    "posted" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "goods_issue_vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goods_issue_lines" (
    "id" TEXT NOT NULL,
    "voucher_id" TEXT NOT NULL,
    "line_no" INTEGER NOT NULL,
    "item_id" TEXT,
    "item_name" TEXT,
    "warehouse_id" TEXT,
    "debit_account" TEXT NOT NULL,
    "credit_account" TEXT NOT NULL,
    "unit" TEXT,
    "quantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "unit_price" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "lot_no" TEXT,
    "expiry_date" DATE,

    CONSTRAINT "goods_issue_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CustomerType" NOT NULL DEFAULT 'ORG',
    "is_supplier" BOOLEAN NOT NULL DEFAULT false,
    "is_internal" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "debt_reminder_on" BOOLEAN NOT NULL DEFAULT true,
    "tax_code" TEXT,
    "budget_relation_code" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "address" TEXT,
    "group_id" TEXT,
    "sales_employee_id" TEXT,
    "contact_name" TEXT,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_vouchers" (
    "id" TEXT NOT NULL,
    "voucher_no" TEXT NOT NULL,
    "invoice_no" TEXT,
    "voucher_type" "SalesVoucherType" NOT NULL,
    "payment_mode" "SalesPaymentMode" NOT NULL DEFAULT 'UNPAID',
    "is_inventory_issue" BOOLEAN NOT NULL DEFAULT false,
    "with_invoice" BOOLEAN NOT NULL DEFAULT false,
    "is_pos_invoice" BOOLEAN NOT NULL DEFAULT false,
    "posting_date" DATE NOT NULL,
    "voucher_date" DATE NOT NULL,
    "customer_id" TEXT,
    "customer_name" TEXT,
    "tax_code" TEXT,
    "contact_person" TEXT,
    "address" TEXT,
    "sales_employee_id" TEXT,
    "description" TEXT,
    "attachment_count" INTEGER NOT NULL DEFAULT 0,
    "payment_term_id" TEXT,
    "credit_days" INTEGER,
    "due_date" DATE,
    "total_goods" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total_vat" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "einvoice_lookup_code" TEXT,
    "einvoice_lookup_url" TEXT,
    "receipt_id" TEXT,
    "issue_id" TEXT,
    "posted" BOOLEAN NOT NULL DEFAULT true,
    "branch_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "sales_vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_voucher_lines" (
    "id" TEXT NOT NULL,
    "voucher_id" TEXT NOT NULL,
    "line_no" INTEGER NOT NULL,
    "item_id" TEXT,
    "item_name" TEXT,
    "trade_discount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "debt_account" TEXT NOT NULL,
    "revenue_account" TEXT NOT NULL,
    "unit" TEXT,
    "quantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "unit_price" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "vat_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "vat_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "vat_account" TEXT NOT NULL,
    "lot_no" TEXT,

    CONSTRAINT "sales_voucher_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_allocations" (
    "id" TEXT NOT NULL,
    "sales_voucher_id" TEXT NOT NULL,
    "cash_voucher_id" TEXT,
    "bank_voucher_id" TEXT,
    "amount" DECIMAL(18,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "general_vouchers" (
    "id" TEXT NOT NULL,
    "voucher_no" TEXT NOT NULL,
    "posting_date" DATE NOT NULL,
    "voucher_date" DATE NOT NULL,
    "description" TEXT,
    "total_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "branch_id" TEXT,
    "posted" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "general_vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "general_voucher_lines" (
    "id" TEXT NOT NULL,
    "voucher_id" TEXT NOT NULL,
    "line_no" INTEGER NOT NULL,
    "description" TEXT,
    "debit_account" TEXT NOT NULL,
    "credit_account" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "partner_id" TEXT,
    "partner_name" TEXT,

    CONSTRAINT "general_voucher_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ProductType" NOT NULL DEFAULT 'GOODS',
    "group_code" TEXT,
    "unit" TEXT,
    "description" TEXT,
    "purchase_description" TEXT,
    "sale_description" TEXT,
    "default_warehouse_code" TEXT,
    "default_warehouse_name" TEXT,
    "inventory_account" TEXT,
    "revenue_account" TEXT,
    "discount_account" TEXT,
    "sale_return_account" TEXT,
    "cost_account" TEXT,
    "purchase_price" DECIMAL(18,2),
    "sale_price" DECIMAL(18,2),
    "min_stock" DECIMAL(18,2),
    "vat_rate" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouses" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "branch" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "department" TEXT,
    "bank_account" TEXT,
    "bank_name" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_groups" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "partner_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_groups" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "product_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_accounts" (
    "id" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "bank_name" TEXT NOT NULL,
    "bank_branch" TEXT,
    "account_holder" TEXT,
    "branch" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_items" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parent_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "expense_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nature" "AccountNature" NOT NULL,
    "name_en" TEXT,
    "description" TEXT,
    "parent_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_objects" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CostObjectType" NOT NULL DEFAULT 'PRODUCT',
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "cost_objects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "income_expense_items" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "IncomeExpenseType" NOT NULL,
    "recurring" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "income_expense_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banks" (
    "id" TEXT NOT NULL,
    "short_name" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "banks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfer_accounts" (
    "id" TEXT NOT NULL,
    "transfer_order" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "from_account" TEXT NOT NULL,
    "to_account" TEXT NOT NULL,
    "side" "TransferSide" NOT NULL DEFAULT 'BOTH',
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "transfer_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "default_accounts" (
    "id" TEXT NOT NULL,
    "default_order" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "debit_account" TEXT,
    "credit_account" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "default_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voucher_types" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "voucher_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_opening_balances" (
    "id" TEXT NOT NULL,
    "account_code" TEXT NOT NULL,
    "account_name" TEXT NOT NULL,
    "debit_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "credit_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_opening_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_opening_balances" (
    "id" TEXT NOT NULL,
    "account_code" TEXT NOT NULL,
    "partner_type" "PartnerType" NOT NULL,
    "partner_id" TEXT NOT NULL,
    "debit_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "credit_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_opening_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fixed_asset_opening_balances" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "asset_type" TEXT NOT NULL,
    "department" TEXT NOT NULL DEFAULT '',
    "original_cost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "depreciable_value" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "accumulated_depreciation" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "acquisition_date" DATE NOT NULL,
    "depreciation_date" DATE NOT NULL,
    "useful_life_months" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "remaining_months" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "asset_account" TEXT NOT NULL,
    "depreciation_account" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fixed_asset_opening_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_account_opening_balances" (
    "id" TEXT NOT NULL,
    "account_code" TEXT NOT NULL,
    "bank_account_id" TEXT NOT NULL,
    "debit_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "credit_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_account_opening_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_opening_balances" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "warehouse_code" TEXT NOT NULL,
    "quantity" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_opening_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_locks" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "lock_date" DATE NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "book_locks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_units" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "level" "OrgUnitLevel" NOT NULL DEFAULT 'DEPARTMENT',
    "parent_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "organization_units_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "cash_vouchers_voucher_no_key" ON "cash_vouchers"("voucher_no");

-- CreateIndex
CREATE INDEX "cash_vouchers_type_posting_date_idx" ON "cash_vouchers"("type", "posting_date");

-- CreateIndex
CREATE INDEX "cash_vouchers_partner_id_idx" ON "cash_vouchers"("partner_id");

-- CreateIndex
CREATE INDEX "cash_voucher_lines_voucher_id_idx" ON "cash_voucher_lines"("voucher_id");

-- CreateIndex
CREATE UNIQUE INDEX "bank_vouchers_voucher_no_key" ON "bank_vouchers"("voucher_no");

-- CreateIndex
CREATE INDEX "bank_vouchers_type_posting_date_idx" ON "bank_vouchers"("type", "posting_date");

-- CreateIndex
CREATE INDEX "bank_vouchers_partner_id_idx" ON "bank_vouchers"("partner_id");

-- CreateIndex
CREATE INDEX "bank_voucher_lines_voucher_id_idx" ON "bank_voucher_lines"("voucher_id");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_code_key" ON "suppliers"("code");

-- CreateIndex
CREATE INDEX "suppliers_name_idx" ON "suppliers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_vouchers_voucher_no_key" ON "purchase_vouchers"("voucher_no");

-- CreateIndex
CREATE INDEX "purchase_vouchers_type_posting_date_idx" ON "purchase_vouchers"("type", "posting_date");

-- CreateIndex
CREATE INDEX "purchase_vouchers_supplier_id_idx" ON "purchase_vouchers"("supplier_id");

-- CreateIndex
CREATE INDEX "purchase_voucher_lines_voucher_id_idx" ON "purchase_voucher_lines"("voucher_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_receipts_voucher_no_key" ON "inventory_receipts"("voucher_no");

-- CreateIndex
CREATE INDEX "inventory_receipts_receipt_type_posting_date_idx" ON "inventory_receipts"("receipt_type", "posting_date");

-- CreateIndex
CREATE INDEX "inventory_receipt_lines_receipt_id_idx" ON "inventory_receipt_lines"("receipt_id");

-- CreateIndex
CREATE UNIQUE INDEX "goods_issue_vouchers_voucher_no_key" ON "goods_issue_vouchers"("voucher_no");

-- CreateIndex
CREATE INDEX "goods_issue_vouchers_category_posting_date_idx" ON "goods_issue_vouchers"("category", "posting_date");

-- CreateIndex
CREATE INDEX "goods_issue_vouchers_customer_id_idx" ON "goods_issue_vouchers"("customer_id");

-- CreateIndex
CREATE INDEX "goods_issue_lines_voucher_id_idx" ON "goods_issue_lines"("voucher_id");

-- CreateIndex
CREATE UNIQUE INDEX "customers_code_key" ON "customers"("code");

-- CreateIndex
CREATE INDEX "customers_name_idx" ON "customers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "sales_vouchers_voucher_no_key" ON "sales_vouchers"("voucher_no");

-- CreateIndex
CREATE INDEX "sales_vouchers_voucher_type_posting_date_idx" ON "sales_vouchers"("voucher_type", "posting_date");

-- CreateIndex
CREATE INDEX "sales_vouchers_customer_id_idx" ON "sales_vouchers"("customer_id");

-- CreateIndex
CREATE INDEX "sales_vouchers_payment_mode_idx" ON "sales_vouchers"("payment_mode");

-- CreateIndex
CREATE INDEX "sales_voucher_lines_voucher_id_idx" ON "sales_voucher_lines"("voucher_id");

-- CreateIndex
CREATE INDEX "payment_allocations_sales_voucher_id_idx" ON "payment_allocations"("sales_voucher_id");

-- CreateIndex
CREATE INDEX "payment_allocations_cash_voucher_id_idx" ON "payment_allocations"("cash_voucher_id");

-- CreateIndex
CREATE INDEX "payment_allocations_bank_voucher_id_idx" ON "payment_allocations"("bank_voucher_id");

-- CreateIndex
CREATE UNIQUE INDEX "general_vouchers_voucher_no_key" ON "general_vouchers"("voucher_no");

-- CreateIndex
CREATE INDEX "general_vouchers_posting_date_idx" ON "general_vouchers"("posting_date");

-- CreateIndex
CREATE INDEX "general_voucher_lines_voucher_id_idx" ON "general_voucher_lines"("voucher_id");

-- CreateIndex
CREATE UNIQUE INDEX "products_code_key" ON "products"("code");

-- CreateIndex
CREATE INDEX "products_name_idx" ON "products"("name");

-- CreateIndex
CREATE INDEX "products_type_idx" ON "products"("type");

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_code_key" ON "warehouses"("code");

-- CreateIndex
CREATE INDEX "warehouses_name_idx" ON "warehouses"("name");

-- CreateIndex
CREATE UNIQUE INDEX "employees_code_key" ON "employees"("code");

-- CreateIndex
CREATE INDEX "employees_name_idx" ON "employees"("name");

-- CreateIndex
CREATE UNIQUE INDEX "partner_groups_code_key" ON "partner_groups"("code");

-- CreateIndex
CREATE INDEX "partner_groups_name_idx" ON "partner_groups"("name");

-- CreateIndex
CREATE UNIQUE INDEX "product_groups_code_key" ON "product_groups"("code");

-- CreateIndex
CREATE INDEX "product_groups_name_idx" ON "product_groups"("name");

-- CreateIndex
CREATE UNIQUE INDEX "bank_accounts_account_number_key" ON "bank_accounts"("account_number");

-- CreateIndex
CREATE INDEX "bank_accounts_bank_name_idx" ON "bank_accounts"("bank_name");

-- CreateIndex
CREATE UNIQUE INDEX "expense_items_code_key" ON "expense_items"("code");

-- CreateIndex
CREATE INDEX "expense_items_name_idx" ON "expense_items"("name");

-- CreateIndex
CREATE INDEX "expense_items_parent_id_idx" ON "expense_items"("parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_number_key" ON "accounts"("number");

-- CreateIndex
CREATE INDEX "accounts_name_idx" ON "accounts"("name");

-- CreateIndex
CREATE INDEX "accounts_parent_id_idx" ON "accounts"("parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "cost_objects_code_key" ON "cost_objects"("code");

-- CreateIndex
CREATE INDEX "cost_objects_name_idx" ON "cost_objects"("name");

-- CreateIndex
CREATE UNIQUE INDEX "income_expense_items_code_key" ON "income_expense_items"("code");

-- CreateIndex
CREATE INDEX "income_expense_items_name_idx" ON "income_expense_items"("name");

-- CreateIndex
CREATE UNIQUE INDEX "banks_short_name_key" ON "banks"("short_name");

-- CreateIndex
CREATE INDEX "banks_full_name_idx" ON "banks"("full_name");

-- CreateIndex
CREATE UNIQUE INDEX "transfer_accounts_code_key" ON "transfer_accounts"("code");

-- CreateIndex
CREATE INDEX "transfer_accounts_transfer_order_idx" ON "transfer_accounts"("transfer_order");

-- CreateIndex
CREATE INDEX "default_accounts_default_order_idx" ON "default_accounts"("default_order");

-- CreateIndex
CREATE INDEX "default_accounts_name_idx" ON "default_accounts"("name");

-- CreateIndex
CREATE UNIQUE INDEX "voucher_types_code_key" ON "voucher_types"("code");

-- CreateIndex
CREATE INDEX "voucher_types_code_idx" ON "voucher_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "units_name_key" ON "units"("name");

-- CreateIndex
CREATE INDEX "units_name_idx" ON "units"("name");

-- CreateIndex
CREATE UNIQUE INDEX "account_opening_balances_account_code_key" ON "account_opening_balances"("account_code");

-- CreateIndex
CREATE INDEX "partner_opening_balances_account_code_idx" ON "partner_opening_balances"("account_code");

-- CreateIndex
CREATE UNIQUE INDEX "partner_opening_balances_account_code_partner_type_partner__key" ON "partner_opening_balances"("account_code", "partner_type", "partner_id");

-- CreateIndex
CREATE UNIQUE INDEX "fixed_asset_opening_balances_code_key" ON "fixed_asset_opening_balances"("code");

-- CreateIndex
CREATE INDEX "bank_account_opening_balances_account_code_idx" ON "bank_account_opening_balances"("account_code");

-- CreateIndex
CREATE UNIQUE INDEX "bank_account_opening_balances_account_code_bank_account_id_key" ON "bank_account_opening_balances"("account_code", "bank_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_opening_balances_product_id_warehouse_code_key" ON "inventory_opening_balances"("product_id", "warehouse_code");

-- CreateIndex
CREATE UNIQUE INDEX "organization_units_code_key" ON "organization_units"("code");

-- CreateIndex
CREATE INDEX "organization_units_name_idx" ON "organization_units"("name");

-- CreateIndex
CREATE INDEX "organization_units_parent_id_idx" ON "organization_units"("parent_id");

-- AddForeignKey
ALTER TABLE "cash_voucher_lines" ADD CONSTRAINT "cash_voucher_lines_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "cash_vouchers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_voucher_lines" ADD CONSTRAINT "bank_voucher_lines_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "bank_vouchers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_voucher_lines" ADD CONSTRAINT "purchase_voucher_lines_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "purchase_vouchers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_receipt_lines" ADD CONSTRAINT "inventory_receipt_lines_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "inventory_receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_issue_lines" ADD CONSTRAINT "goods_issue_lines_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "goods_issue_vouchers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_vouchers" ADD CONSTRAINT "sales_vouchers_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_voucher_lines" ADD CONSTRAINT "sales_voucher_lines_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "sales_vouchers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_sales_voucher_id_fkey" FOREIGN KEY ("sales_voucher_id") REFERENCES "sales_vouchers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_cash_voucher_id_fkey" FOREIGN KEY ("cash_voucher_id") REFERENCES "cash_vouchers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_bank_voucher_id_fkey" FOREIGN KEY ("bank_voucher_id") REFERENCES "bank_vouchers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "general_voucher_lines" ADD CONSTRAINT "general_voucher_lines_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "general_vouchers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_account_opening_balances" ADD CONSTRAINT "bank_account_opening_balances_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_opening_balances" ADD CONSTRAINT "inventory_opening_balances_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

