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
import { useIntl } from 'react-intl'
import { useNavigate } from 'react-router-dom'
import {
  useTypedParams,
  useTypedSearchParams
} from 'react-router-typesafe-routes/dom'
import {
  applyDraftToEventIndex,
  deepDropNulls,
  EventStatus
} from '@opencrvs/commons/client'
import {
  AppBar,
  Button,
  Frame,
  Stack,
  Icon,
  DividerVertical
} from '@opencrvs/components'
import { useDrafts } from '@client/v2-events/features/drafts/useDrafts'
import { useEventConfiguration } from '@client/v2-events/features/events/useEventConfiguration'
import { useEvents } from '@client/v2-events/features/events/useEvents/useEvents'
import { ActionMenu } from '@client/v2-events/features/workqueues/EventOverview/components/ActionMenu'
import { useIntlFormatMessageWithFlattenedParams } from '@client/v2-events/messages/utils'
import { ROUTES } from '@client/v2-events/routes'
import { flattenEventIndex } from '@client/v2-events/utils'
import { DownloadButton } from '@client/v2-events/components/DownloadButton'
import { useUsers } from '@client/v2-events/hooks/useUsers'
import { EventOverviewProvider } from '@client/v2-events/features/workqueues/EventOverview/EventOverviewContext'
import { constantsMessages } from '@client/i18n/messages/constants'
import { useLocations } from '@client/v2-events/hooks/useLocations'
import { useAdministrativeAreas } from '@client/v2-events/hooks/useAdministrativeAreas'

const noNameMessage = {
  id: 'recordAudit.noName',
  defaultMessage: 'No name provided',
  description: 'Label for name not available'
}

export function EventOverviewLayout({
  children
}: {
  children: React.ReactNode
}) {
  const { eventId } = useTypedParams(ROUTES.V2.EVENTS.EVENT)
  const [{ backTo }] = useTypedSearchParams(ROUTES.V2.EVENTS.EVENT)
  const { searchEventById } = useEvents()
  const { getRemoteDraftByEventId } = useDrafts()
  const draft = getRemoteDraftByEventId(eventId)
  const { getUsers } = useUsers()
  const users = getUsers.getAllCached()
  const { getLocations } = useLocations()
  const locations = getLocations.useSuspenseQuery()
  // Niger : précharge ici (comme `locations` ci-dessus) pour que l'onglet
  // "Dossier" (aperçu du Volet 1/Souche, voir SoucheDocumentPreview.tsx) le
  // lise depuis le cache au lieu de déclencher son propre aller-retour
  // réseau après coup — évite un enchaînement de plusieurs chargements
  // successifs à l'ouverture d'un acte.
  const { getAdministrativeAreas } = useAdministrativeAreas()
  getAdministrativeAreas.useSuspenseQuery()

  const eventResults = searchEventById.useSuspenseQuery(eventId)

  const navigate = useNavigate()
  const intl = useIntl()
  const flattenedIntl = useIntlFormatMessageWithFlattenedParams()

  if (eventResults.total === 0) {
    throw new Error(`Event details with id ${eventId} not found`)
  }

  const event = eventResults.results[0]

  const { eventConfiguration } = useEventConfiguration(event.type)
  const eventIndexWithDraftApplied = draft
    ? applyDraftToEventIndex(event, draft, eventConfiguration)
    : event

  const isDraft = event.status === EventStatus.enum.CREATED

  const exit = () => {
    if (backTo) {
      navigate(backTo)
      return
    }

    navigate(ROUTES.V2.buildPath({}))
  }

  return (
    <Frame
      header={
        <AppBar
          desktopRight={
            <Stack>
              <DownloadButton
                key={`DownloadButton-${eventId}`}
                event={eventIndexWithDraftApplied}
                isDraft={isDraft}
              />
              <ActionMenu eventId={eventId} />
              <DividerVertical />
              <Button
                data-testid="exit-event"
                size="small"
                type="icon"
                onClick={exit}
              >
                <Icon name="X" />
              </Button>
            </Stack>
          }
          desktopTitle={
            flattenedIntl.formatMessage(
              eventConfiguration.title,
              flattenEventIndex(deepDropNulls(eventIndexWithDraftApplied))
            ) || intl.formatMessage(noNameMessage)
          }
          mobileRight={
            <>
              <Stack>
                <DownloadButton
                  key={`DownloadButton-${eventId}`}
                  event={eventIndexWithDraftApplied}
                  isDraft={isDraft}
                />
                <ActionMenu eventId={eventId} />
                <DividerVertical />
                <Button
                  data-testid="exit-event"
                  size="small"
                  type="icon"
                  onClick={exit}
                >
                  <Icon name="X" />
                </Button>
              </Stack>
            </>
          }
          mobileTitle={
            flattenedIntl.formatMessage(
              eventConfiguration.title,
              flattenEventIndex(deepDropNulls(eventIndexWithDraftApplied))
            ) || intl.formatMessage(noNameMessage)
          }
        />
      }
      skipToContentText={intl.formatMessage(
        constantsMessages.skipToMainContent
      )}
    >
      <EventOverviewProvider locations={locations} users={users}>
        {children}
      </EventOverviewProvider>
    </Frame>
  )
}
