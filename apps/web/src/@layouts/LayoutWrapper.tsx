'use client'

// React Imports
import { useEffect, type ReactElement } from 'react'

import { usePathname } from 'next/navigation'

import { signIn } from 'next-auth/react'

// Type Imports
import type { SystemMode } from '@core/types'

// Config Imports
import { isPublicRoute } from '@configs/accessControl'

// Hook Imports
import { useSettings } from '@core/hooks/useSettings'
import useLayoutInit from '@core/hooks/useLayoutInit'
import { useAuthUser } from '@/hooks/AuthHooks'

// Local-dev escape hatch, mirrors AUTH_DISABLED in middleware.
const AUTH_DISABLED = process.env.NEXT_PUBLIC_AUTH_DISABLED === 'true'

type LayoutWrapperProps = {
  systemMode: SystemMode
  verticalLayout: ReactElement
  horizontalLayout: ReactElement
}

const LayoutWrapper = (props: LayoutWrapperProps) => {
  // Props
  const { systemMode, verticalLayout, horizontalLayout } = props

  // Hooks
  const { settings } = useSettings()
  const { user, isLoading } = useAuthUser()
  const pathname = usePathname()

  useLayoutInit(systemMode)

  // Send anonymous visitors to ERP — but ONLY on routes that actually require a login.
  // Routes listed in `publicRoutes` must stay readable without signing in; middleware
  // already lets them through, so bouncing here would silently override that.
  // `pathname` has no basePath (Next strips it), which is what isPublicRoute expects.
  useEffect(() => {
    if (AUTH_DISABLED || isLoading || user || isPublicRoute(pathname)) {
      return
    }

    signIn('erpauth')
  }, [user, isLoading, pathname])

  // Return the layout based on the layout context
  return (
    <div className='flex flex-col flex-auto' data-skin={settings.skin}>
      {settings.layout === 'horizontal' ? horizontalLayout : verticalLayout}
    </div>
  )
}

export default LayoutWrapper
