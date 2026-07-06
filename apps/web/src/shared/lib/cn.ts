import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Helper gộp class cho shadcn/ui.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
