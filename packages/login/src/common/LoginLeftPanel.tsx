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
import styled from 'styled-components'
import { useIntl } from 'react-intl'
import { CountryLogo } from '@opencrvs/components/lib/icons'
import { Text } from '@opencrvs/components/lib/Text/Text'
import { fonts } from '@opencrvs/components/lib/fonts'
import { LanguageSelect } from '@login/i18n/components/LanguageSelect'
import { usePersistentCountryLogo } from '@login/common/LoginBackgroundWrapper'
import { LOGIN_BRAND_GREEN } from '@login/common/loginBrandTheme'
import { messages } from '@login/i18n/messages/views/loginBranding'

const LeftPanelShell = styled.div`
  flex: 0 0 340px;
  display: flex;
  flex-direction: column;
  padding: 32px 28px;
  background: ${LOGIN_BRAND_GREEN};
  overflow: hidden;

  @media (max-width: ${({ theme }) => theme.grid.breakpoints.lg}px) {
    flex: 0 0 auto;
    width: 100%;
    padding: 16px 24px;
  }
`

const TopRow = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
`

const LogoBadge = styled.div`
  img,
  svg {
    max-height: 40px;
    width: auto;
  }
`

const LanguageSelectRow = styled.div`
  margin-top: 16px;
`

const BigNameRow = styled.div`
  flex: 1;
  display: flex;
  align-items: center;

  @media (max-width: ${({ theme }) => theme.grid.breakpoints.lg}px) {
    flex: 0 0 auto;
    padding: 12px 0;
  }
`

const BigNameText = styled(Text)`
  @media (max-width: ${({ theme }) => theme.grid.breakpoints.lg}px) {
    ${fonts.h2}
  }
`

// Niger : nom de l'agence (DGECM-R) affiché à côté du logo — distinct du nom
// de l'application (INCI, voir BigNameText plus bas) — même valeur que
// <AgencyName>DGECMR</AgencyName> utilisé après connexion (voir
// packages/client/src/v2-events/layouts/workqueues/index.tsx).
const AGENCY_NAME = 'DGECM-R'

export function LoginLeftPanel() {
  const logo = usePersistentCountryLogo()
  const intl = useIntl()

  return (
    <LeftPanelShell>
      <TopRow>
        <LogoBadge>
          <CountryLogo size="small" src={logo} />
        </LogoBadge>
        <Text variant="bold16" element="span" color="white">
          {AGENCY_NAME}
        </Text>
      </TopRow>
      <LanguageSelectRow>
        <LanguageSelect />
      </LanguageSelectRow>
      <BigNameRow>
        <BigNameText variant="hero" element="span" color="white">
          {intl.formatMessage(messages.brandName)}
        </BigNameText>
      </BigNameRow>
    </LeftPanelShell>
  )
}
