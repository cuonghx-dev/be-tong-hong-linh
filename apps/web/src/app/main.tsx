import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { setupAuthInterceptors } from '@/features/auth/interceptors'
import '../index.css'
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
