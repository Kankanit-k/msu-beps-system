'use client'

import { SessionProvider } from 'next-auth/react'

import { VerticalNavProvider } from '@menu/contexts/verticalNavContext'
import { SettingsProvider } from '@core/contexts/settingsContext'
import ThemeProvider from '@components/theme'

type Props = {
  children: React.ReactNode
  direction: any
  settingsCookie: any
  mode: any
  systemMode: any
}

const ClientProviders = ({ children, direction, settingsCookie, mode, systemMode }: Props) => {
  return (
    <SessionProvider basePath={`${process.env.NEXT_PUBLIC_BASEPATH || '/beps'}/api/auth`}>
      <VerticalNavProvider>
        <SettingsProvider settingsCookie={settingsCookie} mode={mode}>
          <ThemeProvider direction={direction} systemMode={systemMode}>
            {children}
          </ThemeProvider>
        </SettingsProvider>
      </VerticalNavProvider>
    </SessionProvider>
  )
}

export default ClientProviders
