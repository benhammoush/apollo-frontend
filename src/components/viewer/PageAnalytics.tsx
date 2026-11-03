/**
 * Collect coarse page visits without workspace state or private URL details.
 * @packageDocumentation
 */
import { Analytics } from '@vercel/analytics/react'
import { useLocation } from 'react-router-dom'

/** Group deep links by public page; tab changes intentionally do not create page views. */
export default function PageAnalytics() {
  const { pathname } = useLocation()
  const section = pathname.split('/')[1]
  const path = ['engine', 'data', 'account'].includes(section) ? `/${section}` : '/'
  return <Analytics route={path} path={path} />
}
