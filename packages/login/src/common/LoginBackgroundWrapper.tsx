/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * OpenCRVS is also distributed under the terms of the Civil Registration
 * & Healthcare Disclaimer located at http://opencrvs.org/license.
 *
 * Copyright (C) The OpenCRVS Authors located at https://github.com/opencrvs/opencrvs-core/blob/master/AUTHORS.
 */
import * as React from 'react'
import styled, { css, useTheme } from 'styled-components'
import { storage } from '@login/storage'
import {
  selectCountryBackground,
  selectCountryLogo
} from '@login/login/selectors'
import { useSelector } from 'react-redux'
import { isEqual } from 'lodash-es'
import { ITheme } from '@opencrvs/components'
import { LoginLeftPanel } from '@login/common/LoginLeftPanel'
import { LoginFooter } from '@login/common/LoginFooter'
import { LOGIN_BRAND_GREEN } from '@login/common/loginBrandTheme'

// Full-viewport neutral backdrop — the actual login UI is a single bounded
// "widget" card centered on top of it (matching the reference: everything —
// green panel, photo, logo, form — sits inside one square-ish card, and the
// rest of the browser window is just plain background).
const PageShell = styled.div`
  box-sizing: border-box;
  min-height: 100vh;
  width: 100%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: ${({ theme }) => theme.colors.grey200};

  *,
  *:before,
  *:after {
    box-sizing: border-box;
    -webkit-font-smoothing: subpixel-antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
`

const LoginWidgetCard = styled.div`
  width: min(850px, 82vw);
  height: min(420px, 58vh);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid ${LOGIN_BRAND_GREEN};
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.25);

  @media (max-width: ${({ theme }) => theme.grid.breakpoints.lg}px) {
    width: 100%;
    height: auto;
    box-shadow: none;
  }
`

const MainRow = styled.div`
  flex: 1;
  width: 100%;
  min-height: 0;
  display: flex;
  flex-direction: row;

  @media (max-width: ${({ theme }) => theme.grid.breakpoints.lg}px) {
    flex-direction: column;
  }
`

const RightPanel = styled.div<{
  background: NonNullable<ReturnType<typeof selectCountryBackground>>
}>`
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  overflow: hidden;

  ${({ background: { backgroundImage, backgroundColor } }) =>
    backgroundImage
      ? css`
          background-image: url(${backgroundImage});
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
        `
      : css`
          background: #${backgroundColor};
        `}

  @media (max-width: ${({ theme }) => theme.grid.breakpoints.lg}px) {
    min-height: 260px;
  }
`

export interface IProps {
  children: React.ReactNode
}

function usePersistentCountryBackground() {
  const theme = useTheme()
  const [countryBackground, setCountryBackground] = React.useState({
    backgroundColor: `${(theme as ITheme).colors.purpleDarker}`,
    backgroundImage: '',
    imageFit: ''
  })
  const [offlineBackground, setOfflineBackground] =
    React.useState(countryBackground)
  React.useEffect(() => {
    storage.getItem('country-background').then((res) => {
      if (res) {
        setCountryBackground(JSON.parse(res))
      }
    })
  }, [])

  const background = useSelector(selectCountryBackground)

  if (background && !isEqual(background, offlineBackground)) {
    setOfflineBackground(background)
    storage.setItem('country-background', JSON.stringify(background))
  }

  return offlineBackground
}

export function usePersistentCountryLogo() {
  const [offlineLogo, setOfflineLogo] = React.useState('')
  React.useEffect(() => {
    storage.getItem('country-logo').then((res) => {
      if (res) {
        setOfflineLogo(res)
      }
    })
  }, [])
  const logo = useSelector(selectCountryLogo)
  if (logo && logo !== offlineLogo) {
    setOfflineLogo(logo)
    localStorage.setItem('country-logo', logo)
  }
  return offlineLogo
}

export function LoginBackgroundWrapper({ children }: IProps) {
  const countryBackground = usePersistentCountryBackground()
  return (
    <PageShell>
      <LoginWidgetCard>
        <MainRow>
          <LoginLeftPanel />
          <RightPanel background={countryBackground}>{children}</RightPanel>
        </MainRow>
        <LoginFooter />
      </LoginWidgetCard>
    </PageShell>
  )
}
