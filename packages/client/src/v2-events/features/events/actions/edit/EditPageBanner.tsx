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

import React from 'react'
import styled from 'styled-components'
import { defineMessage, useIntl } from 'react-intl'
import { useTypedParams } from 'react-router-typesafe-routes/dom'
import { Icon } from '@opencrvs/components/lib/Icon'
import { Text } from '@opencrvs/components'
import { ActionType, ActionStatus } from '@opencrvs/commons/client'
import { ROUTES } from '@client/v2-events/routes'
import { useEvents } from '@client/v2-events/features/events/useEvents/useEvents'
import { useLocations } from '@client/v2-events/hooks/useLocations'
import { useUserDetails } from '@client/v2-events/hooks/useUserDetails'

const Wrapper = styled.div`
  display: flex;
  flex: 1;
  color: ${({ theme }) => theme.colors.white};
  background-color: ${({ theme }) => theme.colors.orangeDarker};
  padding: 8px 20px;
  align-items: center;
`

const StyledText = styled(Text)`
  margin-left: 8px;
`

const declaredMessage = defineMessage({
  id: 'editPageBanner.declaredMessage',
  defaultMessage:
    'You are editing a record declared by {name} ({role} at {location})',
  description: 'The message for the edit page banner'
})

const notifiedMessage = defineMessage({
  id: 'editPageBanner.notifiedMessage',
  defaultMessage:
    'You are editing a record notified by {name} ({role} at {location})',
  description: 'The message for the edit page banner'
})

// Niger : la raison du rejet (saisie par l'OEC) n'était visible qu'en
// creusant dans l'Historique — l'Agent de Saisie qui corrige l'acte ne
// savait pas quoi corriger. Affichée ici directement sur la page d'édition.
const rejectionReasonMessage = defineMessage({
  id: 'editPageBanner.rejectionReasonMessage',
  defaultMessage: 'Cet acte a été rejeté. Raison : {reason}',
  description: "Message affichant la raison du rejet sur la page d'édition"
})

const RejectionWrapper = styled(Wrapper)`
  background-color: ${({ theme }) => theme.colors.negativeDarker};
`

export function EditPageBanner() {
  const { eventId } = useTypedParams(ROUTES.V2.EVENTS.EDIT.PAGES)
  const intl = useIntl()
  const events = useEvents()
  const event = events.getEvent.getFromCache(eventId)
  const { getLocations } = useLocations()
  const locations = getLocations.useSuspenseQuery()

  const notificationActions = event.actions.filter(
    (a) => a.type === ActionType.NOTIFY && a.status === ActionStatus.Accepted
  )

  const declarationActions = event.actions.filter(
    (a) => a.type === ActionType.DECLARE && a.status === ActionStatus.Accepted
  )

  const latestAction =
    declarationActions.length > 0
      ? declarationActions[declarationActions.length - 1]
      : notificationActions[notificationActions.length - 1]

  // Fetch createdAtLocation and createdBy from latest notification or declaration action
  const { createdAtLocation, createdBy, createdByRole, createdByUserType } =
    latestAction

  const location = createdAtLocation
    ? locations.get(createdAtLocation)
    : undefined

  const { getUserDetails } = useUserDetails()
  const { role, name } = getUserDetails({
    createdByUserType,
    createdBy,
    type: ActionType.DECLARE,
    createdByRole
  })

  const message =
    declarationActions.length > 0 ? declaredMessage : notifiedMessage

  const formattedMessage = intl.formatMessage(message, {
    location: location?.name,
    role,
    name
  })

  const rejectActions = event.actions.filter(
    (
      a
    ): a is typeof a & {
      type: typeof ActionType.REJECT
      content: { reason: string }
    } => a.type === ActionType.REJECT && a.status === ActionStatus.Accepted
  )
  const latestRejectAction = rejectActions[rejectActions.length - 1]
  const rejectionReason = latestRejectAction?.content.reason

  return (
    <>
      {rejectionReason && (
        <RejectionWrapper>
          <Icon name="FileX" size="small" />
          <StyledText color="white" element="span" variant="bold14">
            {intl.formatMessage(rejectionReasonMessage, {
              reason: rejectionReason
            })}
          </StyledText>
        </RejectionWrapper>
      )}
      <Wrapper>
        <Icon name="PencilSimpleLine" size="small" />
        <StyledText color="white" element="span" variant="bold14">
          {formattedMessage}
        </StyledText>
      </Wrapper>
    </>
  )
}
