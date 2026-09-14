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
import { first, orderBy } from 'lodash'
import { useTypedSearchParams } from 'react-router-typesafe-routes/dom'
import { useIntl } from 'react-intl'
import {
  EventDocument,
  mandatoryColumns,
  getCurrentEventState,
  applyDraftToEventIndex,
  getEventConfigById
} from '@opencrvs/commons/client'

import { ROUTES } from '@client/v2-events/routes'
import { CoreWorkqueues, WORKQUEUE_DRAFT } from '@client/v2-events/utils'
import { useEventConfigurations } from '../events/useEventConfiguration'
import { useCountryConfigWorkqueueConfigurations } from '../events/useCountryConfigWorkqueueConfigurations'
import { SearchResultComponent } from '../events/Search/SearchResult/SearchResult'
import { useDrafts } from '../drafts/useDrafts'
import { useOutbox } from '../events/useEvents/outbox'
import { findLocalEventDocument } from '../events/useEvents/api'

// Niger : détache la carte du menu de gauche, comme les autres pages
// restylées (Équipe, Organisation, Registres...). `SearchResultComponent`
// s'appuie sur `WQContentWrapper`, partagé par TOUTES les listes de travail
// de l'appli (y compris les onglets de la page d'accueil) — on enveloppe
// donc ici, localement à Brouillon, plutôt que de modifier ce composant
// partagé et d'affecter des pages non demandées.
const DetachedWrapper = styled.div`
  margin-left: 20px;
`

export function Draft() {
  const [searchParams] = useTypedSearchParams(ROUTES.V2.WORKQUEUES.WORKQUEUE)

  const eventConfigs = useEventConfigurations()
  const countryConfigWorkqueues = useCountryConfigWorkqueueConfigurations()

  const intl = useIntl()

  const outboxIds = useOutbox().map(({ id }) => id)

  const { getAllRemoteDrafts } = useDrafts()

  const drafts = getAllRemoteDrafts({
    refetchOnMount: 'always',
    staleTime: 0,
    refetchInterval: 20000
  })

  const eventsWithDrafts = drafts
    .map(({ eventId }) => findLocalEventDocument(eventId))
    .filter((event): event is EventDocument => !!event)
    .map((event) => {
      const draft = first(drafts.filter((d) => d.eventId === event.id))
      const configuration = getEventConfigById(eventConfigs, event.type)

      const currentEventState = getCurrentEventState(event, configuration)
      return draft
        ? applyDraftToEventIndex(currentEventState, draft, configuration)
        : currentEventState
    })

  const sortedDrafts = orderBy(eventsWithDrafts, 'updatedAt', 'desc')

  const currentPageDrafts = sortedDrafts.slice(
    searchParams.offset || 0,
    searchParams.offset + searchParams.limit
  )

  // Niger : mêmes colonnes Nom/Prénoms/Sexe/Documents/Rôle que les files de
  // travail (voir workqueueConfig.ts) — sinon la liste des brouillons
  // retombait sur les colonnes par défaut ("Event", "Last updated"),
  // incohérent avec le reste de l'application.
  const columns = countryConfigWorkqueues[0]?.columns ?? mandatoryColumns

  return (
    <DetachedWrapper>
      <SearchResultComponent
        key={`${CoreWorkqueues.DRAFT}-${outboxIds.length}`}
        action={WORKQUEUE_DRAFT.action}
        columns={columns}
        eventConfigs={eventConfigs}
        hideEventColumn
        hideTitleName
        paginationVisibleOffline={true}
        queryData={currentPageDrafts}
        title={intl.formatMessage(WORKQUEUE_DRAFT.name)}
        totalResults={eventsWithDrafts.length}
        {...searchParams}
      />
    </DetachedWrapper>
  )
}
