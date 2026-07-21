import { useNavigate } from 'react-router-dom'

// Nút Đóng/Hủy của trang full-page (§5 design.md): quay lại trang trước trong lịch sử router
// (giữ nguyên tab/filter đang xem). Nếu mở trực tiếp bằng link — không có lịch sử trong app
// (React Router v6 lưu chỉ số lịch sử ở history.state.idx, idx = 0 là entry đầu) — thì về fallback.
export function useNavigateBack(fallback: string) {
  const navigate = useNavigate()
  return () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) navigate(-1)
    else navigate(fallback, { replace: true })
  }
}
