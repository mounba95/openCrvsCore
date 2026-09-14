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
import { useLocation, useNavigate } from 'react-router-dom'
import { useIntl } from 'react-intl'
import styled from 'styled-components'
import { useTypedSearchParams } from 'react-router-typesafe-routes/dom'
import { mandatoryColumns, ActionType, QueryType } from '@opencrvs/commons/client'
import { Button, Icon } from '@opencrvs/components'
import { SearchResultComponent } from '@client/v2-events/features/events/Search/SearchResult/SearchResult'
import { useEvents } from '@client/v2-events/features/events/useEvents/useEvents'
import { useEventConfigurations } from '@client/v2-events/features/events/useEventConfiguration'
import { withSuspense } from '@client/v2-events/components/withSuspense'
import { useCurrentUser } from '@client/v2-events/hooks/useCurrentUser'
import { useCountryConfigWorkqueueConfigurations } from '@client/v2-events/features/events/useCountryConfigWorkqueueConfigurations'
import { ROUTES } from '@client/v2-events/routes'
import { buildSimpleSearchQuery } from '@client/v2-events/features/home/RechercheSimple.utils'
import {
  buildAdvancedSearchQuery,
  buildActionsAFaireQuery,
  DateType,
  SexeFilter,
  StatutFilter
} from './AdvancedSearch.utils'
import { buildQuickSearchQuery, deserializeSearchParams } from './utils'

// Niger : détache légèrement la liste de résultats du menu de gauche, comme
// les files de travail (voir Workqueue.tsx) — même valeur (20px) partout.
const DetachedWrapper = styled.div`
  margin-left: 20px;
`

function QuickSearchComponent({
  term,
  eventTypes,
  dateOfEventRange,
  officeId,
  sexe,
  statut,
  dateType,
  anneeRegistreFrom,
  anneeRegistreTo,
  numeroActeFrom,
  numeroActeTo,
  numeroDeclaration,
  judgmentNumber,
  originalActNumber,
  actionSlug
}: {
  term: string
  eventTypes?: string[]
  dateOfEventRange?: { gte: string; lte: string }
  officeId?: string
  sexe?: SexeFilter
  statut?: StatutFilter
  dateType?: DateType
  anneeRegistreFrom?: string
  anneeRegistreTo?: string
  numeroActeFrom?: string
  numeroActeTo?: string
  numeroDeclaration?: string
  judgmentNumber?: string
  originalActNumber?: string
  actionSlug?: string
}) {
  const intl = useIntl()
  const navigate = useNavigate()
  const [typedSearchParams] = useTypedSearchParams(ROUTES.V2.SEARCH)
  const { searchEvent } = useEvents()
  const allEventConfigurations = useEventConfigurations()
  const { currentUser } = useCurrentUser()
  const countryConfigWorkqueues = useCountryConfigWorkqueueConfigurations()
  // Niger : la "Recherche simple" (page d'accueil) et la "Recherche avancée"
  // peuvent toutes deux restreindre la recherche à un groupe de types d'acte,
  // une plage de dates, et/ou une commune précise ("Mairie", sans jamais
  // changer la commune active de la session) — voir
  // features/home/RechercheSimple.tsx et Search/AdvancedSearch.tsx. Sans ces
  // paramètres, comportement strictement inchangé (recherche rapide classique
  // depuis la barre du haut).
  const eventConfigurations = eventTypes
    ? allEventConfigurations.filter(({ id }) => eventTypes.includes(id))
    : allEventConfigurations

  // Niger : présence d'un des champs propres à la Recherche avancée — dans ce
  // cas on construit la requête via `buildAdvancedSearchQuery` (plus riche),
  // au lieu de `buildSimpleSearchQuery`/`buildQuickSearchQuery`.
  const isAdvancedSearch = Boolean(
    sexe ||
      statut ||
      dateType ||
      anneeRegistreFrom ||
      anneeRegistreTo ||
      numeroActeFrom ||
      numeroActeTo ||
      numeroDeclaration ||
      judgmentNumber ||
      originalActNumber ||
      actionSlug
  )

  let query: QueryType
  if (isAdvancedSearch) {
    const restQuery = buildAdvancedSearchQuery({
      term,
      events: eventConfigurations,
      statut,
      dateType,
      dateRange: dateOfEventRange,
      anneeRegistreFrom,
      anneeRegistreTo,
      numeroActeFrom,
      numeroActeTo,
      numeroDeclaration,
      sexe,
      judgmentNumber,
      originalActNumber,
      officeId
    })
    const workqueueConfig = actionSlug
      ? countryConfigWorkqueues.find((w) => w.slug === actionSlug)
      : undefined
    query = workqueueConfig
      ? buildActionsAFaireQuery(workqueueConfig, currentUser, restQuery)
      : restQuery
  } else if (dateOfEventRange || officeId) {
    query = buildSimpleSearchQuery({
      term,
      events: eventConfigurations,
      dateOfEventRange,
      officeId
    })
  } else {
    query = buildQuickSearchQuery(term, eventConfigurations)
  }

  const queryData = searchEvent.useSuspenseQuery({
    query,
    ...typedSearchParams
  })

  // Niger : mêmes colonnes Nom/Prénoms/Sexe/Documents/Rôle que les files de
  // travail (voir workqueueConfig.ts) — sinon les résultats de recherche
  // simple/avancée retombaient sur les colonnes par défaut ("Event",
  // "Last updated"), incohérent avec le reste de l'application. Toutes les
  // files partagent la même définition de colonnes, on réutilise donc
  // celle de la première disponible ; repli sur `mandatoryColumns` si la
  // config country-config n'est pas encore chargée. Un slug précis (ex.
  // "recent") n'est PAS fiable ici : `useCountryConfigWorkqueueConfigurations`
  // filtre déjà la liste selon les files auxquelles le rôle connecté a
  // accès, et "recent" peut être absent pour certains rôles — ce qui
  // retombait silencieusement sur les anciennes colonnes par défaut.
  const columns = countryConfigWorkqueues[0]?.columns ?? mandatoryColumns

  return (
    <DetachedWrapper>
      <SearchResultComponent
        action={{ type: ActionType.READ }}
        columns={columns}
        eventConfigs={eventConfigurations}
        extraTopActionButtons={[
          <Button
            key="back-to-advanced-search"
            id="back-to-advanced-search"
            size="medium"
            type="secondary"
            onClick={() => navigate(ROUTES.V2.ADVANCED_SEARCH.path)}
          >
            <Icon name="MagnifyingGlass" size="small" />
            {intl.formatMessage({
              id: 'v2.home.simpleSearch.advancedSearch',
              defaultMessage: 'Recherche avancée',
              description: 'Bouton vers la recherche avancée'
            })}
          </Button>
        ]}
        hideEventColumn
        hideTitleName
        queryData={queryData.results}
        title={
          term
            ? intl.formatMessage(
                {
                  id: 'search.quickSearch.result.title',
                  description: 'Title for search result page',
                  defaultMessage: 'Search result for “{searchTerm}”'
                },
                {
                  searchTerm: term
                }
              )
            : intl.formatMessage({
                id: 'search.quickSearch.result.title.noTerm',
                description:
                  'Title for search result page when there is no free-text search term (e.g. advanced search by criteria only)',
                defaultMessage: 'Search results'
              })
        }
        totalResults={queryData.total}
        {...typedSearchParams}
      />
    </DetachedWrapper>
  )
}

function QuickSearch() {
  const location = useLocation()
  const searchParams = deserializeSearchParams(location.search) as Record<
    string,
    string
  >

  // Niger : "Recherche simple"/"Recherche avancée" (page d'accueil) peuvent
  // n'envoyer aucun terme libre (ex: recherche par date ou par action à faire
  // seule) — on affiche donc aussi ce résultat si l'un des critères propres à
  // ces panneaux est présent, pas seulement `term`.
  const hasSearchCriteria =
    'term' in searchParams ||
    'eventTypes' in searchParams ||
    'officeId' in searchParams ||
    'sexe' in searchParams ||
    'statut' in searchParams ||
    'anneeRegistreFrom' in searchParams ||
    'anneeRegistreTo' in searchParams ||
    'numeroActeFrom' in searchParams ||
    'numeroActeTo' in searchParams ||
    'numeroDeclaration' in searchParams ||
    'judgmentNumber' in searchParams ||
    'originalActNumber' in searchParams ||
    'actionSlug' in searchParams ||
    ('du' in searchParams && 'au' in searchParams)

  if (!hasSearchCriteria) {
    return null
  }

  const eventTypes = searchParams.eventTypes
    ? searchParams.eventTypes.split(',')
    : undefined
  const dateOfEventRange =
    searchParams.du && searchParams.au
      ? { gte: searchParams.du, lte: searchParams.au }
      : undefined

  return (
    <QuickSearchComponent
      actionSlug={searchParams.actionSlug}
      anneeRegistreFrom={searchParams.anneeRegistreFrom}
      anneeRegistreTo={searchParams.anneeRegistreTo}
      dateOfEventRange={dateOfEventRange}
      dateType={searchParams.dateType as DateType | undefined}
      eventTypes={eventTypes}
      judgmentNumber={searchParams.judgmentNumber}
      numeroActeFrom={searchParams.numeroActeFrom}
      numeroActeTo={searchParams.numeroActeTo}
      numeroDeclaration={searchParams.numeroDeclaration}
      officeId={searchParams.officeId}
      originalActNumber={searchParams.originalActNumber}
      sexe={searchParams.sexe as SexeFilter | undefined}
      statut={searchParams.statut as StatutFilter | undefined}
      term={searchParams.term ?? ''}
    />
  )
}

export const QuickSearchIndex = withSuspense(QuickSearch)
