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
import { buttonMessages } from '@client/i18n/messages'
import { messages as userSetupMessages } from '@client/i18n/messages/views/userSetup'
import {
  DynamicHeightLinkButton,
  LabelContainer,
  ValueContainer
} from '@client/views/Settings/items/components'
import {
  ChangeOfficeModal,
  useChangeOffice
} from '@client/components/ChangeOfficeModal'
import { ListViewItemSimplified } from '@opencrvs/components/lib/ListViewSimplified'
import { useIntl } from 'react-intl'

export function AssignedOffice() {
  const intl = useIntl()
  const {
    canSwitchOffice,
    officeName,
    showModal,
    openModal,
    closeModal,
    selectedOfficeId,
    setSelectedOfficeId,
    confirmChange,
    officeOptions
  } = useChangeOffice()

  return (
    <>
      <ListViewItemSimplified
        label={
          <LabelContainer>
            {intl.formatMessage(userSetupMessages.assignedOffice)}
          </LabelContainer>
        }
        value={<ValueContainer>{officeName}</ValueContainer>}
        actions={
          <DynamicHeightLinkButton
            disabled={!canSwitchOffice}
            onClick={openModal}
          >
            {intl.formatMessage(buttonMessages.change)}
          </DynamicHeightLinkButton>
        }
      />
      <ChangeOfficeModal
        isOpen={showModal}
        officeOptions={officeOptions}
        selectedOfficeId={selectedOfficeId}
        onClose={closeModal}
        onConfirm={confirmChange}
        onSelectOffice={setSelectedOfficeId}
      />
    </>
  )
}
