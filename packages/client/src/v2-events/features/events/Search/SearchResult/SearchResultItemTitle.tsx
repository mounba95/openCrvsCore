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
import { useTheme } from 'styled-components'
import { useNavigate } from 'react-router-dom'
import { EventConfig, EventIndex } from '@opencrvs/commons/client'
import { useWindowSize } from '@opencrvs/components/src/hooks'
import { Link as TextButton } from '@opencrvs/components'
import { IconWithName } from '@client/v2-events/components/IconWithName'
import { IconWithNameEvent } from '@client/v2-events/components/IconWithNameEvent'
import { ROUTES } from '@client/v2-events/routes'
import { useCurrentBackTo } from '@client/v2-events/features/events/useEventFormNavigation'
import { useEventTitle } from '../../useEvents/useEventTitle'
import { ExtendedEventStatuses } from './utils'

export function SearchResultItemTitle({
  event,
  localEventStatus,
  eventConfig,
  hideName
}: {
  event: EventIndex
  localEventStatus: EventIndex['status'] | keyof typeof ExtendedEventStatuses
  eventConfig: EventConfig
  hideName?: boolean
}) {
  const theme = useTheme()
  const { width } = useWindowSize()
  const navigate = useNavigate()
  const backTo = useCurrentBackTo()
  const { getEventTitle } = useEventTitle()
  const { title, useFallbackTitle } = getEventTitle(eventConfig, event)

  const isWideScreen = width > theme.grid.breakpoints.lg
  /**
   * Niger : sur les files de travail dotées des colonnes Nom/Prénoms
   * dédiées, le nom affiché ici ferait doublon — on ne garde alors que
   * l'icône cliquable (voir `hideName` passé depuis `Workqueue.tsx`). La
   * colonne "Date de l'événement" reste séparée, à sa place habituelle
   * (décision utilisateur du 2026-08-18 — pas de fusion avec Title). Le nom
   * reste affiché sur mobile, où les colonnes Nom/Prénoms ne s'affichent
   * pas (voir `getColumns` dans `SearchResult/utils.tsx`).
   */
  const renderIconWithName = () =>
    isWideScreen ? (
      <IconWithName
        flags={event.flags}
        name={hideName ? null : title}
        status={event.status}
      />
    ) : (
      <IconWithNameEvent
        event={event.type}
        flags={event.flags}
        name={title}
        status={event.status}
      />
    )

  if (localEventStatus === ExtendedEventStatuses.OUTBOX) {
    return renderIconWithName()
  }

  return (
    <TextButton
      color={useFallbackTitle ? 'red' : 'primary'}
      onClick={() => {
        navigate(
          ROUTES.V2.EVENTS.EVENT.buildPath({ eventId: event.id }, { backTo })
        )
      }}
    >
      {renderIconWithName()}
    </TextButton>
  )
}
