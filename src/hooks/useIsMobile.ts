import { useEffect, useState } from 'react'

const BREAKPOINT = 768

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < BREAKPOINT)

  useEffect(() => {
    let raf: number
    const handler = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => setIsMobile(window.innerWidth < BREAKPOINT))
    }
    window.addEventListener('resize', handler)
    return () => {
      window.removeEventListener('resize', handler)
      cancelAnimationFrame(raf)
    }
  }, [])

  return isMobile
}
