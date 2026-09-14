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

import React, { useMemo } from 'react'

import {
  useTypedParams,
  useTypedSearchParams
} from 'react-router-typesafe-routes/dom'
import { useIntl } from 'react-intl'
import styled from 'styled-components'
import { precompileActionSchemas } from '@opencrvs/commons/client'
import { useEventConfigurations } from '@client/v2-events/features/events/useEventConfiguration'

import { ROUTES } from '@client/v2-events/routes'
import { useWorkqueue } from '@client/v2-events/hooks/useWorkqueue'
import { CoreWorkqueues } from '@client/v2-events/utils'
import { SearchResultComponent } from '../events/Search/SearchResult/SearchResult'
import { useCountryConfigWorkqueueConfigurations } from '../events/useCountryConfigWorkqueueConfigurations'
import { useOutbox } from '../events/useEvents/outbox'
import { Outbox } from './Outbox'
import { Draft } from './Draft'

// Niger : détache légèrement la liste des actes du menu de gauche, comme
// les autres listes déjà traitées (Brouillon, Registres, Équipe...) — même
// valeur (20px) que partout ailleurs, pas plus.
const DetachedWrapper = styled.div`
  margin-left: 20px;
`

function ConfigurableWorkqueue({ workqueueSlug }: { workqueueSlug: string }) {
  const [searchParams] = useTypedSearchParams(ROUTES.V2.WORKQUEUES.WORKQUEUE)
  const eventConfigs = useEventConfigurations()

  // If actions are not precompiled, every rendered item pays the cost of resolving action configuration conditionals, which can be expensive when there are many items in a list view.
  precompileActionSchemas(eventConfigs)

  const workqueues = useCountryConfigWorkqueueConfigurations()
  const workqueueConfig = workqueues.find(({ slug }) => slug === workqueueSlug)

  if (!workqueueConfig) {
    throw new Error('Workqueue configuration not found for' + workqueueSlug)
  }

  const { getResult } = useWorkqueue(workqueueSlug)
  const outbox = useOutbox()

  const data = getResult({
    offset: searchParams.offset || 0,
    limit: 10
  }).useSuspenseQuery()

  const { total, results } = data

  const intl = useIntl()

  const events = useMemo(
    () => results.filter((event) => !outbox.find(({ id }) => id === event.id)),
    [results, outbox]
  )

  if (!workqueueConfig) {
    throw new Error('Workqueue configuration not found for' + workqueueSlug)
  }

  return (
    <DetachedWrapper>
      <SearchResultComponent
        key={workqueueSlug}
        action={workqueueConfig.action}
        columns={workqueueConfig.columns}
        emptyMessage={workqueueConfig.emptyMessage}
        eventConfigs={eventConfigs}
        // Niger : les files de travail ont leurs propres colonnes Nom/Prénoms
        // et Documents (voir workqueueConfig.ts) — on retire le nom de la
        // colonne "Title" (icône seule) et la colonne "Event" par défaut pour
        // ne pas les afficher en double.
        hideEventColumn
        hideTitleName
        queryData={events}
        title={intl.formatMessage(workqueueConfig.name)}
        totalResults={total}
        {...searchParams}
      />
    </DetachedWrapper>
  )
}

function WorkqueueContent() {
  const { slug: workqueueSlug } = useTypedParams(ROUTES.V2.WORKQUEUES.WORKQUEUE)
  if (!workqueueSlug) {
    throw new Error('Workqueue slug is required')
  }
  if (workqueueSlug === CoreWorkqueues.OUTBOX) {
    return <Outbox />
  }
  if (workqueueSlug === CoreWorkqueues.DRAFT) {
    return <Draft />
  }
  /*
   * Key by slug so switching workqueues remounts the data component and the search query.
   */
  return (
    <ConfigurableWorkqueue key={workqueueSlug} workqueueSlug={workqueueSlug} />
  )
}

// Niger : la création d'actes n'est désormais accessible que depuis la page
// d'accueil (voir features/home/Home.tsx) — plus affichée ici.
export function WorkqueueContainer() {
  return <WorkqueueContent />
}
