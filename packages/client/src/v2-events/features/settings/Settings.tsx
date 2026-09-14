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
import { useIntl } from 'react-intl'
import styled from 'styled-components'
import { ListViewSimplified } from '@opencrvs/components/lib/ListViewSimplified'
import { Content } from '@opencrvs/components/lib/Content'
import { userMessages as messages } from '@client/i18n/messages'
import {
  Name,
  Role,
  Language,
  Password,
  PIN,
  PhoneNumber,
  ProfileImage
} from '@client/views/Settings/items'
import { WorkqueueLayout } from '@client/v2-events/layouts/workqueues'
import { EmailAddress } from '@client/views/Settings/items/EmailAddress'
import { AssignedOffice } from '@client/views/Settings/items/AssignedOffice'
import { withSuspense } from '@client/v2-events/components/withSuspense'

const settingsTitle = {
  id: 'home.header.settingsTitle',
  defaultMessage: 'Settings',
  description: 'settings title'
}

// Niger : même traitement de carte que les pages Équipe/Organisation/
// Registres — fond vert pâle + liseré vert, calqué sur INCI (voir
// FormWizard.tsx). Détachée du menu de gauche (margin-left) —
// WorkqueueLayout utilise <Frame> nu (pas Frame.LayoutForm), donc pas de
// règle `${Content} { margin: 0 }` à contourner ici.
const AccentContent = styled(Content)`
  margin-left: 20px;
  background: #c5e0b5;
  border-top: 4px solid ${({ theme }) => theme.colors.brandGreen};
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
`

function SettingsPageComponent() {
  const intl = useIntl()
  return (
    <WorkqueueLayout title={intl.formatMessage(settingsTitle)}>
      <AccentContent
        showTitleOnMobile={true}
        title={intl.formatMessage(messages.settingsTitle)}
      >
        <ListViewSimplified>
          <Name />
          <PhoneNumber />
          <EmailAddress />
          <Role />
          <AssignedOffice />
          <Language />
          <Password />
          <PIN />
          <ProfileImage />
        </ListViewSimplified>
      </AccentContent>
    </WorkqueueLayout>
  )
}

export const SettingsPage = withSuspense(SettingsPageComponent)
