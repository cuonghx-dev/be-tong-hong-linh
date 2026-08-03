import {
  ArrowLeftRight,
  Bell,
  BookOpen,
  Building2,
  ChartColumn,
  Box,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Eye,
  EyeOff,
  FileSpreadsheet,
  House,
  Landmark,
  Layers,
  ListFilter,
  Minus,
  PanelLeft,
  Play,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  Settings,
  ShoppingCart,
  Sigma,
  Sparkles,
  SquareMinus,
  SquarePlus,
  Trash2,
  User,
  Wallet,
  X,
  type LucideProps,
} from 'lucide-react'
import type { ComponentType } from 'react'

// Bộ icon của app = lucide-react (cùng thư viện shadcn dùng cho Select/Checkbox/Dialog).
// Trước đây đây là ~200 dòng SVG vẽ tay chạy song song với lucide → 2 hệ icon, khác
// stroke-width. Giữ nguyên tên `*Icon` + prop `size` để không phải sửa 71 call site.
export type IconProps = Omit<LucideProps, 'ref'> & { size?: number }

const icon =
  (C: ComponentType<LucideProps>) =>
  ({ size = 20, ...props }: IconProps) => <C size={size} {...props} />

export const PlusIcon = icon(Plus)
export const PlusSquareIcon = icon(SquarePlus)
export const MinusSquareIcon = icon(SquareMinus)
export const SearchIcon = icon(Search)
export const BellIcon = icon(Bell)
export const HelpIcon = icon(CircleHelp)
export const SettingsIcon = icon(Settings)
export const UserIcon = icon(User)
export const ChevronDownIcon = icon(ChevronDown)
export const ChevronLeftIcon = icon(ChevronLeft)
export const ChevronRightIcon = icon(ChevronRight)
export const EyeIcon = icon(Eye)
export const EyeOffIcon = icon(EyeOff)
export const RefreshIcon = icon(RefreshCw)
export const ExcelIcon = icon(FileSpreadsheet)
export const FilterIcon = icon(ListFilter)
export const HomeIcon = icon(House)
export const WalletIcon = icon(Wallet)
export const BankIcon = icon(Landmark)
export const PackageIcon = icon(Box)
export const CartIcon = icon(ShoppingCart)
export const ReceiptIcon = icon(ReceiptText)
export const ChartIcon = icon(ChartColumn)
export const BookIcon = icon(BookOpen)
export const BuildingIcon = icon(Building2)
export const LayersIcon = icon(Layers)
export const SigmaIcon = icon(Sigma)
export const PanelLeftIcon = icon(PanelLeft)
export const PlayIcon = icon(Play)
export const XIcon = icon(X)
export const TrashIcon = icon(Trash2)
export const SparkleIcon = icon(Sparkles)
export const CheckIcon = icon(Check)
export const MinusIcon = icon(Minus)
export const TransferIcon = icon(ArrowLeftRight)
