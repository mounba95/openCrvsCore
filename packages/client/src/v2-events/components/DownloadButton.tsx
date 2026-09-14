/* eslint-disable import/order */
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
import { Button } from '@opencrvs/components/lib/Button'
import { AvatarSmall } from '@client/components/Avatar'
import { constantsMessages } from '@client/i18n/messages'
import { useOnlineStatus } from '@client/utils'
import { Spinner } from '@opencrvs/components/lib/Spinner'
import { Download, Downloaded } from '@opencrvs/components/lib/icons'
import { ConnectionError } from '@opencrvs/components/lib/icons/ConnectionError'
import React from 'react'
import { useIntl } from 'react-intl'
import ReactTooltip from 'react-tooltip'
import styled from 'styled-components'
import {
  AssignmentStatus,
  EventIndex,
  getAssignmentStatus,
  getOrThrow,
  TokenUserType
} from '@opencrvs/commons/client'
import { getUsersFullName } from '../utils'
import { useAuthentication } from '@client/utils/userUtils'
import { useEvents } from '../features/events/useEvents/useEvents'
import { useUsers } from '../hooks/useUsers'

interface DownloadButtonProps {
  id?: string
  className?: string
  event: EventIndex
  isDraft?: boolean
}

const StatusIndicator = styled.div<{
  isLoading?: boolean
}>`
  height: 40px;
  width: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
`
const DownloadAction = styled(Button)`
  border-radius: 50%;
  height: 40px;
  width: 40px;
  & > div {
    padding: 0px 0px;
  }
`
const NoConnectionViewContainer = styled.div`
  height: 40px;
  width: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  .no-connection {
    ::after {
      display: none;
    }
  }
`

export function DownloadButton({
  id,
  className,
  event,
  isDraft = false
}: DownloadButtonProps) {
  const intl = useIntl()

  const isOnline = useOnlineStatus()

  const maybeAuth = useAuthentication()
  const authentication = getOrThrow(
    maybeAuth,
    'Authentication is not available but is required'
  )

  const { getEvent, actions } = useEvents()
  const users = useUsers()
  const user = users.getUsers.useQueryById(event.assignedTo || '', {
    enabled: !!event.assignedTo
  }).data

  if (user && user.type === TokenUserType.enum.system) {
    throw new Error(
      `Event ${event.id} is assigned to a system user. This should never happen`
    )
  }

  const assignmentStatus = getAssignmentStatus(event, authentication.sub)

  const eventDocument = getEvent.useFindEventFromCache(event.id)
  const isAssignMutationFetching = actions.assignment.assign.isAssigning(
    event.id
  )

  if (!isOnline) {
    return (
      <NoConnectionViewContainer>
        <div
          data-tip
          data-class="no-connection"
          data-for={`${id}_noConnection`}
          data-testid="no-connection-icon"
        >
          <ConnectionError key={id} id={`${id}_noConnection`} />
        </div>
        <ReactTooltip effect="solid" id={`${id}_noConnection`} place="top">
          {intl.formatMessage(constantsMessages.noConnection)}
        </ReactTooltip>
      </NoConnectionViewContainer>
    )
  }

  if (eventDocument.isFetching || isAssignMutationFetching) {
    return (
      <StatusIndicator
        className={className}
        data-testid="download-loading-icon"
        id={`${id}-download-loading`}
        isLoading={true}
      >
        <Spinner id={`action-loading-${id}`} size={24} />
      </StatusIndicator>
    )
  }
  const isFailed = eventDocument.isError

  const isDownloadedToMe =
    assignmentStatus === AssignmentStatus.ASSIGNED_TO_SELF &&
    eventDocument.isFetched

  if (isDraft && isDownloadedToMe) {
    return <Downloaded data-testid="downloaded-icon" />
  }

  const isAssignedToSomeoneElse =
    assignmentStatus === AssignmentStatus.ASSIGNED_TO_OTHERS

  // Niger : l'assignation manuelle a été retirée — un acte s'assigne
  // automatiquement à l'ouverture (voir `useAutoAssignOnOpen`). Le seul cas
  // restant où ce bouton déclenche encore `assignment.assign` est le
  // rafraîchissement local d'un acte DÉJÀ assigné à soi-même mais pas encore
  // téléchargé (ex: après un rechargement de page) — ce n'est pas une
  // revendication, juste un nouveau téléchargement des données.
  const handleDownload = async () => {
    if (
      assignmentStatus === AssignmentStatus.ASSIGNED_TO_SELF &&
      !eventDocument.isFetched
    ) {
      void actions.assignment.assign.mutate({
        eventId: event.id,
        assignedTo: authentication.sub,
        refetchEvent: eventDocument.refetch
      })
    }
  }

  const showsNeutralIcon = !isAssignedToSomeoneElse && !isDownloadedToMe

  return (
    <DownloadAction
      aria-label={intl.formatMessage({
        id: 'user.avatar',
        defaultMessage: 'User avatar'
      })}
      className={className}
      disabled={
        !(
          isOnline &&
          assignmentStatus === AssignmentStatus.ASSIGNED_TO_SELF &&
          !eventDocument.isFetched
        )
      }
      id={`${id}-icon${isFailed ? `-failed` : ``}`}
      type="icon"
      onClick={handleDownload}
    >
      {showsNeutralIcon ? (
        <Download isFailed={isFailed} />
      ) : (
        <AvatarSmall
          key={user?.avatar || 'default'}
          avatar={user?.avatar || undefined}
          name={user && getUsersFullName(user.name)}
        />
      )}
    </DownloadAction>
  )
}
