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
import { isArray, isNil, isPlainObject, isString } from 'lodash'
import { parse as parseQuery, stringify } from 'qs'
import { validate as validateEmail } from 'email-validator'
import {
  EventConfig,
  FieldConfig,
  QueryType,
  FieldType,
  QueryExpression
} from '@opencrvs/commons/client'
import { getAllUniqueFields } from '@opencrvs/commons/client'

/**
 * Niger : lit dynamiquement le champ "date de l'événement" d'un événement
 * (référence `$$field`, jamais codé en dur — ce champ diffère par ex. entre
 * le décès de base (`eventDetails.date`) et sa copie conforme
 * (`deceased.dateOfDeath`)). Partagé par Recherche simple (page d'accueil)
 * et Recherche avancée.
 */
export function getDateOfEventFieldId(event: EventConfig): string | undefined {
  const ref = event.dateOfEvent
  return ref && '$$field' in ref ? ref.$$field : undefined
}

/**
 * Niger : construit une clause OR d'une plage de dates scopée par type
 * d'événement — chaque événement fournit son propre id de champ (résolu via
 * `fieldIdResolver`, ex: `getDateOfEventFieldId`), et les événements sans ce
 * champ sont silencieusement omis (pas de clause invalide). Partagé par
 * Recherche simple et Recherche avancée.
 */
export function buildPerEventFieldRangeClause(
  events: EventConfig[],
  fieldIdResolver: (event: EventConfig) => string | undefined,
  range: { gte: string; lte: string }
): QueryType | undefined {
  const clauses = events
    .map((event): QueryExpression | undefined => {
      const fieldId = fieldIdResolver(event)
      if (!fieldId) {
        return undefined
      }
      return {
        eventType: event.id,
        data: { [fieldId]: { type: 'range' as const, ...range } }
      }
    })
    .filter((clause): clause is QueryExpression => Boolean(clause))

  if (clauses.length === 0) {
    return undefined
  }
  return { type: 'or', clauses } as QueryType
}

const searchFieldTypeMapping = {
  [FieldType.NAME]: 'fuzzy',
  [FieldType.ID]: 'exact',
  [FieldType.EMAIL]: 'exact',
  [FieldType.PHONE]: 'exact'
} as const

const searchFields = Object.keys(
  searchFieldTypeMapping
) as (keyof typeof searchFieldTypeMapping)[]

function metadataFieldTypeMapping(value: string) {
  return [
    {
      trackingId: {
        term: value,
        type: 'exact' as const
      },
      'legalStatuses.REGISTERED.registrationNumber': {
        term: value,
        type: 'exact' as const
      }
    }
  ]
}

function addMetadataFieldsInQuickSearchQuery(
  clauses: QueryExpression[],
  term: string
): QueryExpression[] {
  const mappings = metadataFieldTypeMapping(term)

  const metadataClauses = mappings.flatMap((mapping) =>
    Object.entries(mapping).map(([field, config]) => ({ [field]: config }))
  )

  return [...clauses, ...metadataClauses]
}

function buildQueryFromQuickSearchFields(
  searchableFields: FieldConfig[],
  term: string
): QueryType {
  let clauses: QueryExpression[] = []
  for (const field of searchableFields) {
    const matchType =
      searchFieldTypeMapping[field.type as keyof typeof searchFieldTypeMapping]

    const queryClause: QueryExpression = Object.keys(
      searchFieldTypeMapping
    ).includes(field.type) // Check if the field type is in the mapping to determine if it's a declaration field
      ? { data: { [field.id]: { type: matchType, term } } }
      : { [field.id]: { type: matchType, term } }

    clauses.push(queryClause)
  }

  if (!validateEmail(term)) {
    // Add metadata fields for non-email terms only
    clauses = addMetadataFieldsInQuickSearchQuery(clauses, term)
  }

  return {
    type: 'or',
    clauses
  } as QueryType
}

/**
 * Builds a quick search query for Elasticsearch based on the provided search parameters and event configurations.
 *
 * Quick search is designed for user-friendly, broad matching. It performs:
 * - `fuzzy` matches on fields like name.
 * - `exact` matches on fields like ID, email, phone.
 * - additional exact matches on metadata fields like `trackingId` and `registrationNumber`.
 *
 * The resulting query uses `OR` logic (`type: 'or'`), meaning any matching clause is sufficient.
 *
 * @param searchParams - A flat object of field-value pairs submitted from the UI.
 * @param events - The event configurations to extract searchable fields from.
 * @returns QueryType - A structured query used to hit Elasticsearch.
 */
export function buildQuickSearchQuery(
  term: string,
  events: EventConfig[]
): QueryType {
  // Flatten all searchable fields from the selected events
  const fieldsOfEvents = events.reduce<FieldConfig[]>((acc, event) => {
    const fields = getAllUniqueFields(event)
    return [...acc, ...fields]
  }, [])

  const isEmailTerm = validateEmail(term)

  // Filter fields to only include those that are supported in quick search
  const fieldsToSearch = fieldsOfEvents
    .filter((field) =>
      searchFields.includes(field.type as keyof typeof searchFieldTypeMapping)
    )
    // Skip email terms for non-email fields https://github.com/opencrvs/opencrvs-core/issues/11199
    .filter((field) => !isEmailTerm || field.type === FieldType.EMAIL)

  // Delegate to the actual query builder
  return buildQueryFromQuickSearchFields(fieldsToSearch, term)
}

function serializeValue(value: unknown) {
  if (isArray(value)) {
    return value.length > 0
      ? value.map((v) => (isPlainObject(v) ? JSON.stringify(v) : v))
      : undefined
  }
  if (isPlainObject(value)) {
    return JSON.stringify(value)
  }

  return value
}

export function serializeSearchParams(
  eventState: Record<string, unknown>
): string {
  const simplifiedValue = Object.entries(eventState).reduce(
    (acc, [key, value]) => {
      const serialized = serializeValue(value)
      // If we don't care about the empty objects, we might be able to keep it as simple as this:
      if (!isNil(serialized) && !(serialized === '')) {
        acc[key] = serialized
      }

      return acc
    },
    {} as Record<string, unknown>
  )
  return stringify(simplifiedValue, {
    // Configs are to match query-string behavior. qs adds indices by default for arrays. Otherwise they are arbitrary.
    indices: false,
    sort: (a, b) => a.localeCompare(b)
  })
}

function tryParse(value: unknown): unknown {
  if (!isString(value)) {
    return value
  }

  try {
    if (isArray(value)) {
      return value.map(tryParse)
    } else {
      const parsed = JSON.parse(value)
      // Only return parsed if it's an object or array (i.e., something we stringified before)
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed
      }
    }
  } catch {}

  return value
}
export function deserializeSearchParams(
  queryParams: string
): Record<string, unknown> {
  const parsedParams = parseQuery(queryParams, {
    ignoreQueryPrefix: true
  })

  const deserialized = Object.entries(parsedParams).reduce(
    (acc, [key, value]) => {
      if (isArray(value)) {
        acc[key] = value.map(tryParse)
      } else {
        acc[key] = tryParse(value)
      }

      return acc
    },
    {} as Record<string, unknown>
  )

  return deserialized
}
