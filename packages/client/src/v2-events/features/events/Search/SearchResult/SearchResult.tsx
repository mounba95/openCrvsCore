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
import React, { useState, useMemo, PropsWithChildren, useCallback } from 'react'
import { useIntl } from 'react-intl'
import { orderBy } from 'lodash'
import { useTheme } from 'styled-components'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { useTypedParams } from 'react-router-typesafe-routes/dom'
import {
  EventIndex,
  EventConfig,
  WorkqueueColumn,
  TranslationConfig,
  WorkqueueActionType
} from '@opencrvs/commons/client'
import { useWindowSize } from '@opencrvs/components/src/hooks'
import { Button, Icon } from '@opencrvs/components'
import {
  ColumnContentAlignment,
  SORT_ORDER,
  Workqueue
} from '@opencrvs/components/lib/Workqueue'
import { ROUTES } from '@client/v2-events/routes'
import { useEvents } from '@client/v2-events/features/events/useEvents/useEvents'
import { invalidateWorkqueueSearchQueries } from '@client/v2-events/features/events/useEvents/api'
import { WQContentWrapper } from '@client/v2-events/features/workqueues/components/ContentWrapper'
import { useDrafts } from '@client/v2-events/features/drafts/useDrafts'
import { useOnlineStatus } from '@client/utils'
import { deserializeSearchParams, serializeSearchParams } from '../utils'
import { useEventTitle } from '../../useEvents/useEventTitle'
import {
  enrichEventsForWorkueue,
  COLUMNS,
  createSortFunction,
  getColumns,
  getDefaultColumns,
  getNoResultsText,
  processEventsToRows
} from './utils'

const WithTestId = styled.div.attrs({ 'data-testid': 'search-result' })``
export const SearchResultComponent = ({
  columns,
  queryData: events,
  eventConfigs,
  limit = 10,
  offset = 0,
  title: contentTitle,
  tabBarContent,
  action,
  emptyMessage,
  totalResults,
  paginationVisibleOffline,
  hideTitleName,
  hideEventColumn,
  extraTopActionButtons
}: PropsWithChildren<{
  columns: WorkqueueColumn[]
  eventConfigs: EventConfig[]
  queryData: EventIndex[]
  limit?: number
  offset?: number
  title: string
  totalResults: number
  tabBarContent?: React.ReactNode
  action?: { type: WorkqueueActionType }
  emptyMessage?: TranslationConfig
  paginationVisibleOffline?: boolean
  /**
   * Niger : quand la file affiche déjà ses propres colonnes Nom/Prénoms et
   * Documents, on retire le nom de la colonne "Title" (icône seule) et la
   * colonne "Event" par défaut pour éviter le doublon — voir Workqueue.tsx.
   */
  hideTitleName?: boolean
  hideEventColumn?: boolean
  /**
   * Niger : boutons additionnels affichés sur la même ligne que le titre, à
   * droite (ex. "Recherche avancée" sur la page de résultats de recherche).
   */
  extraTopActionButtons?: React.ReactElement[]
}>) => {
  const { slug } = useTypedParams(ROUTES.V2.WORKQUEUES.WORKQUEUE)
  const intl = useIntl()

  const navigate = useNavigate()
  const { width: windowWidth } = useWindowSize()
  const theme = useTheme()

  const isOnline = useOnlineStatus()
  const params = deserializeSearchParams(location.search) as Record<
    string,
    string
  >

  const setOffset = (newOffset: number) => {
    params.offset = String(newOffset)
    navigate(
      {
        pathname: slug
          ? ROUTES.V2.WORKQUEUES.WORKQUEUE.buildPath({ slug })
          : location.pathname,
        search: serializeSearchParams(params)
      },
      { replace: true }
    )
  }

  const { getOutbox } = useEvents()
  const { getAllRemoteDrafts } = useDrafts()
  const { getEventTitle } = useEventTitle()

  const outbox = getOutbox()
  const drafts = getAllRemoteDrafts()

  const [sortedCol, setSortedCol] = useState<
    (typeof COLUMNS)[keyof typeof COLUMNS]
  >(COLUMNS.LAST_UPDATED)

  const [sortOrder, setSortOrder] = useState<
    (typeof SORT_ORDER)[keyof typeof SORT_ORDER]
  >(SORT_ORDER.DESCENDING)

  const getSortFunction = useCallback(
    (column: string) =>
      createSortFunction(
        sortedCol,
        sortOrder,
        setSortedCol,
        setSortOrder
      )(column),
    [sortedCol, sortOrder]
  )

  const isWideScreen = windowWidth > theme.grid.breakpoints.lg

  const rows = useMemo(() => {
    const enrichedEvents = enrichEventsForWorkueue({
      getEventTitle,
      events,
      eventConfigs,
      drafts,
      outbox
    })

    const orderedEvents = orderBy(
      enrichedEvents,
      // @ts-expect-error --- default columns have non-matching keys like 'NONE' that will never be found.
      (item) => item.enrichedEvent[sortedCol] ?? '',
      sortOrder
    )

    return processEventsToRows({
      enrichedEvents: orderedEvents,
      eventConfigs,
      columns,
      outbox,
      action,
      isWideScreen,
      isOnline,
      intl,
      hideTitleName
    })
  }, [
    events,
    eventConfigs,
    columns,
    drafts,
    outbox,
    action,
    getEventTitle,
    isWideScreen,
    isOnline,
    intl,
    sortedCol,
    sortOrder,
    hideTitleName
  ])

  const currentPageNumber = Math.floor(offset / limit) + 1
  const totalPages = totalResults ? Math.ceil(totalResults / limit) : 0

  const isShowPagination = totalPages > 1

  const noResultText = getNoResultsText({
    title: contentTitle,
    intl,
    slug,
    searchTerm: params.term
  })

  const responsiveColumns = useMemo(() => {
    if (isWideScreen) {
      return [
        ...getDefaultColumns(
          intl,
          sortedCol,
          getSortFunction,
          hideEventColumn,
          hideTitleName ? 8 : undefined
        ),
        ...getColumns({
          isWideScreen,
          intl,
          columns,
          sortedCol,
          getSortFunction
        }),
        {
          width: 20,
          key: COLUMNS.ACTIONS,
          isActionColumn: true,
          alignment: ColumnContentAlignment.RIGHT
        }
      ]
    }

    return [
      {
        // Niger : sur mobile, les colonnes personnalisées ne s'affichent
        // pas — on garde toujours "Title" complet (icône + nom), jamais
        // caché par `hideEventColumn` qui ne retire que "Event".
        ...getDefaultColumns(intl, sortedCol, getSortFunction)[0],
        width: 70
      },
      {
        width: 30,
        key: COLUMNS.ACTIONS,
        isActionColumn: true,
        alignment: ColumnContentAlignment.RIGHT
      }
    ]
  }, [
    isWideScreen,
    intl,
    columns,
    sortedCol,
    getSortFunction,
    hideEventColumn,
    hideTitleName
  ])

  // Niger : nombre total de résultats affiché à côté du titre, comme sur
  // l'écran "Résultats de Recherche (N)" d'INCI (capture fournie le
  // 2026-08-18) — appliqué à toutes les listes (files de travail,
  // recherche, brouillons, boîte d'envoi) puisqu'elles fournissent toutes
  // déjà `totalResults`.
  const titleWithCount = `${contentTitle} (${totalResults})`

  const topActionButtons = [
    slug ? (
      <Button
        key="refresh"
        aria-label="Actualiser"
        size="medium"
        type="icon"
        onClick={() => invalidateWorkqueueSearchQueries(slug)}
      >
        <Icon name="ArrowCounterClockwise" />
      </Button>
    ) : null,
    ...(extraTopActionButtons ?? [])
  ].filter((button): button is React.ReactElement => button !== null)

  return (
    <WithTestId>
      <WQContentWrapper
        error={false}
        isMobileSize={windowWidth < theme.grid.breakpoints.lg}
        isShowPagination={isShowPagination}
        noContent={totalResults === 0}
        noResultText={
          emptyMessage ? intl.formatMessage(emptyMessage) : noResultText
        }
        paginationId={currentPageNumber}
        paginationVisibleOffline={paginationVisibleOffline}
        tabBarContent={tabBarContent}
        title={titleWithCount}
        topActionButtons={
          topActionButtons.length > 0 ? topActionButtons : undefined
        }
        totalPages={totalPages}
        onPageChange={(page) => setOffset((page - 1) * limit)}
      >
        <Workqueue
          columns={responsiveColumns}
          content={rows}
          hideLastBorder={!isShowPagination}
          sortOrder={sortOrder}
        />
      </WQContentWrapper>
    </WithTestId>
  )
}
