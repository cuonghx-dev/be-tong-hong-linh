import { forwardRef, useLayoutEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  // Vị trí ban đầu do picker tính lúc mở (getBoundingClientRect của input).
  pos: { top: number; left: number; width: number }
  // Ô input neo panel. Radix Dialog autofocus chạy NGAY khi dialog còn animation
  // zoom-in-95 → rect đo lúc đó lệch (scale 0.95). Panel tự bám lại anchor vài
  // frame sau khi mount để chốt đúng vị trí cuối cùng.
  anchor?: HTMLElement | null
  // Bề rộng tối thiểu của bảng dropdown (mỗi picker một cỡ).
  minWidth?: number
  children: ReactNode
}

// Khung dropdown chung cho các *Picker (đối tượng/TK/VTHH/kho/TKNH).
// Portal ra document.body vì DialogContent (Radix) có transform translate —
// transform tạo containing block mới khiến position:fixed tính theo dialog
// thay vì viewport → panel văng xuống đáy màn hình khi picker nằm trong Modal.
// - data-picker-panel: để DialogContent bỏ qua interact-outside/Escape (xem dialog.tsx).
// - pointerEvents auto: Radix modal khóa pointer-events trên body khi mở dialog.
export const PickerPanel = forwardRef<HTMLDivElement, Props>(function PickerPanel(
  { pos, anchor, minWidth = 680, children },
  ref,
) {
  const [p, setP] = useState(pos)

  useLayoutEffect(() => {
    if (!anchor) return
    let raf = 0
    const start = performance.now()
    const track = () => {
      const r = anchor.getBoundingClientRect()
      const width = Math.min(Math.max(r.width, minWidth), window.innerWidth - 24)
      const left = Math.min(r.left, window.innerWidth - width - 12)
      const top = r.bottom + 4
      setP((prev) =>
        prev.top === top && prev.left === left && prev.width === width
          ? prev
          : { top, left, width },
      )
      // Animation mở dialog dài 200ms; theo dõi 300ms là đủ chốt vị trí.
      if (performance.now() - start < 300) raf = requestAnimationFrame(track)
    }
    track()
    return () => cancelAnimationFrame(raf)
  }, [anchor, minWidth])

  return createPortal(
    <div
      ref={ref}
      data-picker-panel=""
      // Radix modal khóa cuộn (react-remove-scroll): listener wheel/touchmove ở
      // document preventDefault mọi cuộn NGOÀI subtree của DialogContent — panel
      // portal ra body nên dính khóa. Chặn event nổi lên document để trình duyệt
      // cuộn native danh sách trong panel bình thường.
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        top: p.top,
        left: p.left,
        width: p.width,
        pointerEvents: 'auto',
      }}
      className="z-50 overflow-hidden rounded-md border border-border bg-white shadow-lg"
    >
      {children}
    </div>,
    document.body,
  )
})
