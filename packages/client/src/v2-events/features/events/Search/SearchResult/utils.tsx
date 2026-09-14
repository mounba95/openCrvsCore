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

import { defineMessages, IntlShape } from 'react-intl'
import React from 'react'
import { first } from 'lodash'
import { ColumnContentAlignment, SORT_ORDER } from '@opencrvs/components'
import {
  defaultWorkqueueColumns,
  EventStatus,
  WorkqueueColumn,
  EventIndex,
  EventConfig,
  deepDropNulls,
  applyDraftToEventIndex,
  getEventConfigById,
  getDeclarationFields,
  getMixedPath,
  Draft,
  WorkqueueActionType
} from '@opencrvs/commons/client'

import { formattedDuration } from '../../../../../utils/date-formatting'
import { ActionCta } from '../ActionCta'
import RetryButton from '../../../../components/RetryButton'
import { OutboxEventIndex } from '../../useEvents/outbox'
import { SearchResultItemTitle } from './SearchResultItemTitle'
import { Output } from '../../components/Output'

const messages = defineMessages({
  noRecord: {
    id: 'search.noRecord',
    defaultMessage:
      'No records {slug, select, draft {in drafts} outbox {require processing} other {{title}}}',
    description: 'The no record text'
  },
  noResult: {
    id: 'search.noResult',
    defaultMessage: 'No result',
    description: 'The no result text'
  },
  noResultFor: {
    id: 'search.noResultForSearchTerm',
    defaultMessage: 'No results for "{searchTerm}"',
    description: 'The no result text'
  },
  eventStatus: {
    id: 'events.status',
    defaultMessage:
      '{status, select, OUTBOX {Syncing..} CREATED {Draft} VALIDATED {Validated} DRAFT {Draft} DECLARED {Declared} REGISTERED {Registered} CERTIFIED {Certified} REJECTED {Requires update} ARCHIVED {Archived} MARK_AS_DUPLICATE {Marked as a duplicate} NOTIFIED {In progress} other {Unknown}}'
  },
  waitingForAction: {
    id: 'events.outbox.waitingForAction',
    defaultMessage:
      'Waiting to {action, select, DECLARE {send} REGISTER {register} VALIDATE {send for approval} NOTIFY {send} REJECT {send for updates} ARCHIVE {archive} PRINT_CERTIFICATE {certify} REQUEST_CORRECTION {request correction} APPROVE_CORRECTION {approve correction} REJECT_CORRECTION {reject correction} ASSIGN {assign} UNASSIGN {unassign} other {action}}'
  },
  processingAction: {
    id: 'events.outbox.processingAction',
    defaultMessage:
      '{action, select, DECLARE {Sending} REGISTER {Registering} VALIDATE {Sending for approval} NOTIFY {Sending} REJECT {Sending for updates} ARCHIVE {Archiving} PRINT_CERTIFICATE {Certifying} REQUEST_CORRECTION {Requesting correction} APPROVE_CORRECTION {Approving correction} REJECT_CORRECTION {Rejecting correction} ASSIGN {Assigning} UNASSIGN {Unassigning} other {Processing action}}'
  }
})

export const ExtendedEventStatuses = {
  OUTBOX: 'OUTBOX',
  DRAFT: 'DRAFT'
} as const

/**
 * @returns event status, correcting for local outbox and draft statuses
 */
function getLocalEventStatus({
  eventId,
  currentStatus,
  outbox,
  drafts
}: {
  eventId: string
  currentStatus: EventStatus
  outbox: EventIndex[]
  drafts: Draft[]
}): EventStatus | keyof typeof ExtendedEventStatuses {
  const isInOutbox = outbox.some((outboxEvent) => outboxEvent.id === eventId)
  const isInDrafts = drafts.some((draft) => draft.eventId === eventId)

  // Note: The order is intentional here. Drafts take precedence over outbox.
  // When triggering event, there is a brief moment when both draft and outbox may exist.
  if (isInDrafts) {
    return ExtendedEventStatuses.DRAFT
  }

  if (isInOutbox) {
    return ExtendedEventStatuses.OUTBOX
  }

  return currentStatus
}

interface Column {
  label?: string
  width: number
  key: string
  sortFunction?: (columnName: string) => void
  isActionColumn?: boolean
  isSorted?: boolean
  alignment?: ColumnContentAlignment
}

export const COLUMNS = {
  ICON_WITH_NAME: 'iconWithName',
  ICON_WITH_NAME_EVENT: 'iconWithNameEvent',
  EVENT: 'type',
  DATE_OF_EVENT: 'dateOfEvent',
  PLACE_OF_EVENT: 'placeOfEvent',
  SENT_FOR_REVIEW: 'sentForReview',
  SENT_FOR_UPDATES: 'sentForUpdates',
  SENT_FOR_APPROVAL: 'sentForApproval',
  SENT_FOR_VALIDATION: 'sentForValidation',
  REGISTERED: 'registered',
  LAST_UPDATED: 'updatedAt',
  ACTIONS: 'actions',
  NOTIFICATION_SENT: 'notificationSent',
  NAME: 'title',
  TRACKING_ID: 'trackingId',
  REGISTRATION_NO: 'registrationNumber',
  NONE: 'none'
} as const

function changeSortedColumn(
  columnName: string,
  presentSortedCol: (typeof COLUMNS)[keyof typeof COLUMNS],
  presentSortOrder: (typeof SORT_ORDER)[keyof typeof SORT_ORDER]
) {
  let newSortedCol: (typeof COLUMNS)[keyof typeof COLUMNS]
  let newSortOrder: (typeof SORT_ORDER)[keyof typeof SORT_ORDER] =
    SORT_ORDER.ASCENDING

  switch (columnName) {
    case COLUMNS.ICON_WITH_NAME:
      newSortedCol = COLUMNS.NAME
      break
    case COLUMNS.NAME:
      newSortedCol = COLUMNS.NAME
      break
    case COLUMNS.EVENT:
      newSortedCol = COLUMNS.EVENT
      break
    case COLUMNS.DATE_OF_EVENT:
      newSortedCol = COLUMNS.DATE_OF_EVENT
      break
    case COLUMNS.PLACE_OF_EVENT:
      newSortedCol = COLUMNS.PLACE_OF_EVENT
      break
    case COLUMNS.SENT_FOR_REVIEW:
      newSortedCol = COLUMNS.SENT_FOR_REVIEW
      break
    case COLUMNS.SENT_FOR_UPDATES:
      newSortedCol = COLUMNS.SENT_FOR_UPDATES
      break
    case COLUMNS.SENT_FOR_APPROVAL:
      newSortedCol = COLUMNS.SENT_FOR_APPROVAL
      break
    case COLUMNS.REGISTERED:
      newSortedCol = COLUMNS.REGISTERED
      break
    case COLUMNS.SENT_FOR_VALIDATION:
      newSortedCol = COLUMNS.SENT_FOR_VALIDATION
      break
    case COLUMNS.NOTIFICATION_SENT:
      newSortedCol = COLUMNS.NOTIFICATION_SENT
      break
    case COLUMNS.LAST_UPDATED:
      newSortedCol = COLUMNS.LAST_UPDATED
      break
    case COLUMNS.TRACKING_ID:
      newSortedCol = COLUMNS.TRACKING_ID
      break
    case COLUMNS.REGISTRATION_NO:
      newSortedCol = COLUMNS.REGISTRATION_NO
      break
    default:
      newSortedCol = COLUMNS.NONE
  }

  if (newSortedCol === presentSortedCol) {
    if (presentSortOrder === SORT_ORDER.ASCENDING) {
      newSortOrder = SORT_ORDER.DESCENDING
    } else {
      newSortOrder = SORT_ORDER.ASCENDING
      newSortedCol = COLUMNS.NONE
    }
  }

  return {
    newSortedCol,
    newSortOrder
  }
}

export function createSortFunction(
  sortedCol: (typeof COLUMNS)[keyof typeof COLUMNS],
  sortOrder: (typeof SORT_ORDER)[keyof typeof SORT_ORDER],
  setSortedCol: (col: (typeof COLUMNS)[keyof typeof COLUMNS]) => void,
  setSortOrder: (order: (typeof SORT_ORDER)[keyof typeof SORT_ORDER]) => void
) {
  return function getSortFunction(column: string) {
    if (!Object.values(COLUMNS).some((col) => col === column)) {
      return undefined
    }

    return function handleSort(columnName: string) {
      const { newSortedCol, newSortOrder } = changeSortedColumn(
        columnName,
        sortedCol,
        sortOrder
      )

      setSortedCol(newSortedCol)
      setSortOrder(newSortOrder)
    }
  }
}

/**
 * Niger : calcule une clé de colonne stable pour les 3 formes possibles de
 * `WorkqueueColumn.value` — inchangé pour `$event` (clé de métadonnée
 * native), sinon dérivé de l'id de traduction du libellé de la colonne
 * (garanti unique par colonne, jamais en collision avec une clé `$event`
 * grâce au préfixe). Utilisé à la fois pour construire l'en-tête de
 * colonne (`getColumns`/`getDefaultColumns`) et pour nommer la propriété
 * correspondante sur chaque ligne (`processEventsToRows`) — les deux DOIVENT
 * rester synchronisés, d'où ce point unique.
 */
export function getColumnKey({
  label,
  value
}: Pick<WorkqueueColumn, 'label' | 'value'>): string {
  if ('$event' in value) {
    return value.$event
  }
  return `col__${label.id}`
}

/**
 * Niger : `hideEventColumn` retire la colonne "Event"/"Type" par défaut
 * quand la file de travail fournit déjà sa propre colonne "Documents"
 * (voir `Workqueue.tsx`) — sinon les deux colonnes feraient doublon.
 * `titleWidth` permet de réduire la largeur de "Title" quand elle
 * n'affiche plus que l'icône (voir `hideTitleName`) — sinon les 35% par
 * défaut (dimensionnés pour icône + nom) laissent un grand vide avant la
 * colonne suivante.
 */
export function getDefaultColumns(
  intl: IntlShape,
  sortedCol: (typeof COLUMNS)[keyof typeof COLUMNS],
  getSortFunction: (
    column: string
  ) => ((columnName: string) => void) | undefined,
  hideEventColumn?: boolean,
  titleWidth?: number
): Array<Column> {
  return defaultWorkqueueColumns
    .filter((column) => !hideEventColumn || getColumnKey(column) !== COLUMNS.EVENT)
    .map((column): Column => {
      const key = getColumnKey(column)
      return {
        label: intl.formatMessage(column.label),
        width: key === 'title' ? (titleWidth ?? 35) : 15,
        key,
        sortFunction: getSortFunction(key),
        isSorted: sortedCol === key
      }
    })
}

export function getColumns({
  isWideScreen,
  intl,
  columns,
  sortedCol,
  getSortFunction
}: {
  isWideScreen: boolean
  intl: IntlShape
  columns: WorkqueueColumn[]
  sortedCol: (typeof COLUMNS)[keyof typeof COLUMNS]
  getSortFunction: (
    column: string
  ) => ((columnName: string) => void) | undefined
}): Array<Column> {
  if (isWideScreen) {
    return columns.map((column) => {
      const key = getColumnKey(column)
      return {
        label: intl.formatMessage(column.label),
        width: column.width ?? (key === 'outbox' ? 35 : 15),
        key,
        sortFunction: getSortFunction(key),
        isSorted: sortedCol === key
      }
    })
  } else {
    return columns
      .map((column) => {
        const key = getColumnKey(column)
        return {
          label: intl.formatMessage(column.label),
          width: 15,
          key,
          sortFunction: getSortFunction(key),
          isSorted: sortedCol === key
        }
      })
      .slice(0, 2)
  }
}

export function getNoResultsText({
  title,
  slug,
  intl,
  searchTerm
}: {
  title: string
  slug?: string
  intl: IntlShape
  searchTerm?: string
}) {
  let noResultText = ''
  if (slug) {
    noResultText = intl.formatMessage(messages.noRecord, {
      slug,
      title: title.toLowerCase()
    })
  } else {
    if (searchTerm) {
      noResultText = intl.formatMessage(messages.noResultFor, {
        searchTerm
      })
    } else {
      noResultText = intl.formatMessage(messages.noResult)
    }
  }
  return noResultText
}

/**
 * Niger : la colonne "DownloadButton" (icône de téléchargement/assignation
 * manuelle) a été retirée des files d'attente — l'assignation est déjà
 * automatique au clic sur une action (voir `useEnsureAssignedToSelf.ts`,
 * `useEventActionsOnClick.tsx`), donc cette icône ne faisait plus que
 * s'afficher sans réelle utilité, et sa forme (flèche circulaire) prêtait à
 * confusion avec un indicateur de chargement même à l'arrêt (signalé par
 * l'utilisateur le 2026-08-09).
 */
function buildAvailableActionComponents({
  event,
  localEventStatus,
  action,
  isWideScreen
}: {
  event: EventIndex
  localEventStatus: EventIndex['status'] | keyof typeof ExtendedEventStatuses
  action?: { type: WorkqueueActionType }
  isWideScreen: boolean
}) {
  const actionConfigs: Array<{ actionComponent: () => React.ReactNode }> = []

  if (isWideScreen) {
    if (action) {
      actionConfigs.push({
        actionComponent: () => (
          <ActionCta
            key={'ActionCta-' + event.id}
            actionType={action.type}
            event={event}
          />
        )
      })
    }

    if (localEventStatus === ExtendedEventStatuses.OUTBOX) {
      actionConfigs.push({
        actionComponent: () => (
          <RetryButton key={'RetryButton-' + event.id} event={event} />
        )
      })
    }
  }

  return actionConfigs
}

/**
 * Given events with their configs, returns Workqueue row data with necessary transformations and computed fields to perform sorting and display of actions based on local event status (accounting for outbox and drafts).
 */
export function enrichEventsForWorkueue({
  events,
  eventConfigs,
  drafts,
  outbox,
  getEventTitle
}: {
  events: EventIndex[]
  eventConfigs: EventConfig[]
  drafts: Draft[]
  outbox: OutboxEventIndex[]
  getEventTitle: (
    eventConfig: EventConfig,
    event: EventIndex
  ) => { title: string | null; useFallbackTitle: boolean }
}): {
  enrichedEvent: EventIndex & { title: string | null }
  localEventStatus: EventIndex['status'] | keyof typeof ExtendedEventStatuses
}[] {
  return events.map((event) => {
    const eventConfig = getEventConfigById(eventConfigs, event.type)
    const draft = first(drafts.filter((d) => d.eventId === event.id))
    const eventWithDraft = draft
      ? deepDropNulls(applyDraftToEventIndex(event, draft, eventConfig))
      : event
    const localEventStatus = getLocalEventStatus({
      eventId: eventWithDraft.id,
      currentStatus: eventWithDraft.status,
      outbox,
      drafts
    })

    const { title } = getEventTitle(eventConfig, eventWithDraft)
    return {
      enrichedEvent: { ...eventWithDraft, title },
      localEventStatus
    }
  })
}

/**
 * Niger : résout la valeur d'une colonne `$declaration` (id de champ fixe,
 * ou map id-par-type-d'événement) pour la ligne d'un événement donné —
 * même motif que `EventSummary.tsx` (ReferenceField) : on retrouve le
 * `FieldConfig` réel pour un rendu formaté selon le type de champ
 * (`Output`), plutôt que d'afficher la valeur brute. Retourne `''` si le
 * type d'événement n'a pas d'entrée dans la map — jamais d'erreur (une
 * file de travail mélange souvent plusieurs types d'actes).
 *
 * Cas des sous-chemins (ex. `child.name.surname`) : un champ NAME n'est
 * déclaré qu'une fois sous son id racine (`child.name`), jamais séparément
 * pour `.firstname`/`.surname` — donc aucun `FieldConfig` ne correspondra
 * jamais exactement à ces ids-là. Dans ce cas, on affiche simplement la
 * valeur brute résolue (une chaîne, ex. le nom de famille) plutôt qu'une
 * cellule vide.
 */
function resolveDeclarationColumnValue(
  fieldIdOrMap: string | Record<string, string>,
  enrichedEvent: EventIndex,
  eventConfig: EventConfig
): React.ReactNode {
  const fieldId =
    typeof fieldIdOrMap === 'string'
      ? fieldIdOrMap
      : fieldIdOrMap[enrichedEvent.type]

  if (!fieldId) {
    return ''
  }

  const value = getMixedPath(enrichedEvent.declaration, fieldId, '')

  const fieldConfig = getDeclarationFields(eventConfig).find(
    (f) => f.id === fieldId
  )

  if (!fieldConfig) {
    return typeof value === 'string' || typeof value === 'number'
      ? String(value)
      : ''
  }

  return <Output eventConfig={eventConfig} field={fieldConfig} value={value} />
}

/**
 * Given events with their configs, returns Workqueue row data with necessary transformations and computed fields
 */
export function processEventsToRows({
  enrichedEvents,
  eventConfigs,
  columns,
  outbox,
  action,
  isWideScreen,
  isOnline,
  intl,
  hideTitleName
}: {
  enrichedEvents: {
    enrichedEvent: EventIndex & { title: string | null }
    localEventStatus: EventIndex['status'] | keyof typeof ExtendedEventStatuses
  }[]
  eventConfigs: EventConfig[]
  columns: WorkqueueColumn[]
  outbox: OutboxEventIndex[]
  action?: { type: WorkqueueActionType }
  isWideScreen: boolean
  isOnline: boolean
  intl: IntlShape
  hideTitleName?: boolean
}) {
  return enrichedEvents.map(({ enrichedEvent, localEventStatus }) => {
    const eventConfig = getEventConfigById(eventConfigs, enrichedEvent.type)

    const actionComponents = buildAvailableActionComponents({
      event: enrichedEvent,
      localEventStatus,
      action,
      isWideScreen
    })

    const outboxMeta = outbox.find((o) => o.id === enrichedEvent.id)?.meta

    const customColumnValues = Object.fromEntries(
      columns.flatMap((column) => {
        const { value } = column
        const key = getColumnKey(column)

        if ('$declaration' in value) {
          return [
            [
              key,
              resolveDeclarationColumnValue(
                value.$declaration,
                enrichedEvent,
                eventConfig
              )
            ] as const
          ]
        }

        if ('$roleLabel' in value) {
          const labelConfig = value.$roleLabel[enrichedEvent.type]
          return [
            [key, labelConfig ? intl.formatMessage(labelConfig) : ''] as const
          ]
        }

        return []
      })
    )

    return {
      ...enrichedEvent,
      ...customColumnValues,
      actions: actionComponents,
      label: eventConfig.label,
      type: intl.formatMessage(eventConfig.label),
      createdAt: formattedDuration(new Date(enrichedEvent.createdAt)),
      updatedAt: formattedDuration(new Date(enrichedEvent.updatedAt)),
      registrationNumber:
        enrichedEvent.legalStatuses?.REGISTERED?.registrationNumber ?? '',
      status: intl.formatMessage(messages.eventStatus, {
        status: localEventStatus
      }),
      title: (
        <SearchResultItemTitle
          event={enrichedEvent}
          eventConfig={eventConfig}
          hideName={hideTitleName}
          localEventStatus={localEventStatus}
        />
      ),
      outbox: intl.formatMessage(
        isOnline ? messages.processingAction : messages.waitingForAction,
        {
          action:
            typeof outboxMeta?.actionType === 'string'
              ? outboxMeta.actionType
              : ''
        }
      )
    }
  })
}
