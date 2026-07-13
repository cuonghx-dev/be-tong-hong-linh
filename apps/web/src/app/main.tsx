import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import { setupAuthInterceptors } from '@/features/auth/interceptors'
import { AppProviders } from './providers'
import { AppRouter } from './router'

setupAuthInterceptors()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <AppRouter />
    </AppProviders>
  </StrictMode>,
)
