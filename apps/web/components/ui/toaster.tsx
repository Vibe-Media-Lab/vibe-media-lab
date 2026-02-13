'use client'

import { Toaster as SonnerToaster } from 'sonner'

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      theme="dark"
      toastOptions={{
        style: {
          background: 'rgba(15, 15, 25, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          color: '#ffffff',
        },
      }}
    />
  )
}
