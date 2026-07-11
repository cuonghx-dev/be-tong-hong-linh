import { PartialType } from '@nestjs/swagger'
import { CreateIncomeExpenseItemDto } from './create-income-expense-item.dto'

export class UpdateIncomeExpenseItemDto extends PartialType(CreateIncomeExpenseItemDto) {}
