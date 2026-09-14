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
import { useSelector } from 'react-redux'
import { useIntl } from 'react-intl'
import { Text } from '@opencrvs/components/lib/Text/Text'
import { selectApplicationName } from '@login/login/selectors'
import { messages } from '@login/i18n/messages/views/loginFooter'

const FooterBar = styled.div`
  width: 100%;
  flex: 0 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 8px 24px;
  background: ${({ theme }) => theme.colors.white};
  border-top: 1px solid ${({ theme }) => theme.colors.grey300};
`

export function LoginFooter() {
  const intl = useIntl()
  const appName = useSelector(selectApplicationName)
  const currentYear = new Date().getFullYear()

  return (
    <FooterBar>
      <Text variant="bold12" element="span">
        {intl.formatMessage(messages.version, { version: APP_VERSION })}
      </Text>
      <Text variant="reg12" element="span">
        {intl.formatMessage(messages.copyright, { currentYear, appName })}
      </Text>
    </FooterBar>
  )
}
