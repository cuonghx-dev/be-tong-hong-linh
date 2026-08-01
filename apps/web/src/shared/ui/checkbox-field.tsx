import { useId, type ReactNode } from 'react'
import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { cn } from '@/shared/lib/cn'
import { Checkbox } from '@/shared/ui/checkbox'
import { Label } from '@/shared/ui/label'

interface CheckboxFieldProps<T extends FieldValues> {
  control: Control<T>
  name: FieldPath<T>
  label: ReactNode
  className?: string
}

// Checkbox + nhãn nối vào react-hook-form.
// Radix Checkbox render ra <button>, không nhận `register()` như <input type="checkbox">
// nên phải đi qua Controller. Bọc chung 1 chỗ để mọi form không lặp lại boilerplate đó.
export function CheckboxField<T extends FieldValues>({
  control,
  name,
  label,
  className,
}: CheckboxFieldProps<T>) {
  const id = useId()
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <div className={cn('flex w-fit items-center gap-2', className)}>
          <Checkbox
            id={id}
            checked={!!field.value}
            onCheckedChange={(v) => field.onChange(v === true)}
            onBlur={field.onBlur}
            ref={field.ref}
          />
          <Label htmlFor={id} className="cursor-pointer text-sm font-normal text-slate-700">
            {label}
          </Label>
        </div>
      )}
    />
  )
}
