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
import { messages as userSetupMessages } from '@client/i18n/messages/views/userSetup'
import { buttonMessages } from '@client/i18n/messages'
import { useLocations } from '@client/v2-events/hooks/useLocations'
import { useUsers } from '@client/v2-events/hooks/useUsers'
import { useActiveOfficeStore } from '@client/v2-events/hooks/useActiveOffice'
import { queryClient } from '@client/v2-events/trpc'
import { UUID } from '@opencrvs/commons/client'
import { Button, Dialog } from '@opencrvs/components'
import { Select } from '@opencrvs/components/lib/Select'

/**
 * Niger : logique partagée de bascule de commune active — utilisée à la
 * fois depuis Paramètres (AssignedOffice.tsx) et directement depuis le menu
 * profil (ProfileMenu.tsx, visible sur la page d'accueil et toutes les
 * autres pages), pour que l'action soit accessible sans devoir aller dans
 * Paramètres.
 */
export function useChangeOffice() {
  const { getLocations } = useLocations()
  const { getMyContext } = useUsers()
  const locations = getLocations.useSuspenseQuery()
  const myContext = getMyContext.useSuspenseQuery()
  const setActiveOffice = useActiveOfficeStore((state) => state.setActiveOffice)

  const [showModal, setShowModal] = React.useState(false)
  const [selectedOfficeId, setSelectedOfficeId] = React.useState<string>(
    myContext.primaryOfficeId
  )

  const canSwitchOffice = myContext.officeIds.length > 1
  const officeName = locations.get(myContext.primaryOfficeId as UUID)?.name ?? ''

  function openModal() {
    setSelectedOfficeId(myContext.primaryOfficeId)
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
  }

  async function confirmChange() {
    setActiveOffice(selectedOfficeId as UUID)
    setShowModal(false)
    await queryClient.invalidateQueries()
  }

  const officeOptions = myContext.officeIds.map((officeId) => ({
    value: officeId,
    label: locations.get(officeId)?.name ?? officeId
  }))

  return {
    canSwitchOffice,
    officeName,
    showModal,
    openModal,
    closeModal,
    selectedOfficeId,
    setSelectedOfficeId,
    confirmChange,
    officeOptions
  }
}

export function ChangeOfficeModal({
  isOpen,
  onClose,
  selectedOfficeId,
  onSelectOffice,
  onConfirm,
  officeOptions
}: {
  isOpen: boolean
  onClose: () => void
  selectedOfficeId: string
  onSelectOffice: (officeId: string) => void
  onConfirm: () => void
  officeOptions: { value: string; label: string }[]
}) {
  const intl = useIntl()

  return (
    <Dialog
      headerVariant="green"
      id="ChangeOfficeModal"
      isOpen={isOpen}
      title={intl.formatMessage(userSetupMessages.changeOfficeTitle)}
      actions={[
        <Button
          key="cancel"
          id="modal_cancel"
          size="large"
          type="tertiary"
          onClick={onClose}
        >
          {intl.formatMessage(buttonMessages.cancel)}
        </Button>,
        <Button
          key="apply"
          id="apply_change"
          size="large"
          type="primary"
          onClick={onConfirm}
        >
          {intl.formatMessage(buttonMessages.apply)}
        </Button>
      ]}
      onClose={onClose}
    >
      <p>{intl.formatMessage(userSetupMessages.changeOfficeMessage)}</p>
      <Select
        id="SelectActiveOffice"
        options={officeOptions}
        placeholder=""
        value={selectedOfficeId}
        onChange={onSelectOffice}
      />
    </Dialog>
  )
}
