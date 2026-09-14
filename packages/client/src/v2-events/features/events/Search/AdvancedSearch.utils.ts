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
import {
  deserializeQuery,
  EventConfig,
  EventStatus,
  QueryExpression,
  QueryType,
  UserOrSystem,
  WorkqueueConfig
} from '@opencrvs/commons/client'
import {
  ActGroup,
  getEventModelKind
} from '@client/v2-events/features/events/actGroups'
import {
  buildPerEventFieldRangeClause,
  buildQuickSearchQuery,
  getDateOfEventFieldId
} from '@client/v2-events/features/events/Search/utils'

export type ModeleFilter =
  | 'all'
  | 'declaration'
  | 'judgment'
  | 'certified-copy'
  | 'certified-copy-before-1985'
export type SexeFilter = 'all' | 'male' | 'female'
export type StatutFilter = 'all' | 'finalized' | 'not-finalized'
export type DateType = 'dateOfEvent' | 'acceptedAt' | 'updatedAt'

/**
 * Niger : champ "Sexe" — n'existe que sur 4 des 12 modèles (naissance et
 * décès, y compris leurs copies conformes) ; volontairement absent des 8
 * autres (jugements, mariage, divorce) — vérifié directement dans le code,
 * pas supposé. La clause doit être omise pour ces 8-là, jamais appliquée à
 * l'aveugle.
 */
const GENDER_FIELD_BY_EVENT: Record<string, string> = {
  birth: 'child.gender',
  'birth-certified-copy': 'child.gender',
  'birth-certified-copy-before-1985': 'child.gender',
  death: 'deceased.gender',
  'death-certified-copy': 'deceased.gender',
  'death-certified-copy-before-1985': 'deceased.gender'
}

/**
 * Niger : "N° de la déclaration" — numéro attribué par le centre de
 * déclaration, saisi en premier par l'agent lors de la déclaration papier.
 * N'existe que sur les 4 modèles "déclaration" de base (pas les jugements,
 * pas les copies conformes) — voir `childWithDeclarationNumber` dans
 * `opencrvs-countryconfig/src/events/birth/forms/declaration.ts`.
 */
const DECLARATION_NUMBER_FIELD_BY_EVENT: Record<string, string> = {
  birth: 'child.declarationNumber',
  death: 'deceased.declarationNumber',
  marriage: 'husband.declarationNumber',
  divorce: 'husband.declarationNumber'
}

/**
 * Résout la liste des `EventConfig` à interroger à partir du couple
 * Type d'Acte (groupe INCI, ou "all") + Modèle (déclaration/jugement/copie
 * conforme, ou "all") choisis dans la Recherche Avancée.
 */
export function resolveEventsForActeAndModele(
  groups: ActGroup[],
  allEvents: EventConfig[],
  acteId: string,
  modele: ModeleFilter
): EventConfig[] {
  const eventIds =
    acteId === 'all'
      ? groups.flatMap((group) => group.eventIds)
      : (groups.find((group) => group.id === acteId)?.eventIds ?? [])

  const filteredIds =
    modele === 'all'
      ? eventIds
      : eventIds.filter((id) => getEventModelKind(id) === modele)

  return allEvents.filter((event) => filteredIds.includes(event.id))
}

/**
 * Niger : requête de la Recherche Avancée (page unique inspirée d'INCI).
 * Chaque critère est ajouté comme une clause ET optionnelle, uniquement
 * lorsqu'il est renseigné — les critères propres à un modèle précis
 * (N° du jugement, N° de l'acte d'origine, Sexe) sont scopés par type
 * d'événement (OR des seuls événements concernés) plutôt qu'appliqués à
 * l'aveugle à toute la sélection, suivant le même motif que
 * `buildSimpleSearchQuery` (Recherche simple, page d'accueil).
 */
export function buildAdvancedSearchQuery(args: {
  term: string
  events: EventConfig[]
  statut?: StatutFilter
  dateType?: DateType
  dateRange?: { gte: string; lte: string }
  anneeRegistreFrom?: string
  anneeRegistreTo?: string
  numeroActeFrom?: string
  numeroActeTo?: string
  numeroDeclaration?: string
  sexe?: SexeFilter
  judgmentNumber?: string
  originalActNumber?: string
  officeId?: string
}): QueryType {
  const termClause: QueryType = args.term
    ? buildQuickSearchQuery(args.term, args.events)
    : {
        type: 'or',
        clauses: args.events.map((event) => ({ eventType: event.id }))
      }

  let query = termClause

  if (args.statut && args.statut !== 'all') {
    const statusClause: QueryExpression =
      args.statut === 'finalized'
        ? { status: { type: 'exact', term: EventStatus.enum.REGISTERED } }
        : {
            status: {
              type: 'anyOf',
              terms: EventStatus.options.filter(
                (status) => status !== EventStatus.enum.REGISTERED
              )
            }
          }
    query = { type: 'and', clauses: [query, statusClause] }
  }

  if (args.dateType && args.dateRange) {
    if (args.dateType === 'dateOfEvent') {
      const clause = buildPerEventFieldRangeClause(
        args.events,
        getDateOfEventFieldId,
        args.dateRange
      )
      if (clause) {
        query = { type: 'and', clauses: [query, clause] }
      }
    } else {
      const fieldId: 'legalStatuses.REGISTERED.acceptedAt' | 'updatedAt' =
        args.dateType === 'acceptedAt'
          ? 'legalStatuses.REGISTERED.acceptedAt'
          : 'updatedAt'
      const clause: QueryExpression = {
        [fieldId]: { type: 'range', ...args.dateRange }
      }
      query = { type: 'and', clauses: [query, clause] }
    }
  }

  // Niger : "Année du registre : de X à Y" — les numéros d'acte repartent de
  // zéro chaque année (par bureau/type d'acte, voir
  // generateSequentialActNumber), donc "Numéro de l'Acte" seul est ambigu à
  // grande échelle. Ce champ dédié lève l'ambiguïté sans dépendre du
  // sélecteur "Période recherchée" (les deux sont indépendants et peuvent
  // être combinés). Aucune année n'est stockée dans le texte du numéro
  // lui-même — on passe donc par l'année civile de la date d'enregistrement
  // (legalStatuses.REGISTERED.acceptedAt). Plage ouverte : chaque borne est
  // indépendante (on peut ne renseigner que "de" ou que "à") — mais le
  // schéma `RangeDate` exige gte ET lte, donc la borne absente est comblée
  // par une date sentinelle très éloignée plutôt que de rendre les deux
  // bornes obligatoires.
  if (args.anneeRegistreFrom || args.anneeRegistreTo) {
    const clause: QueryExpression = {
      'legalStatuses.REGISTERED.acceptedAt': {
        type: 'range',
        gte: args.anneeRegistreFrom
          ? `${args.anneeRegistreFrom}-01-01`
          : '1900-01-01',
        lte: args.anneeRegistreTo ? `${args.anneeRegistreTo}-12-31` : '2100-12-31'
      }
    }
    query = { type: 'and', clauses: [query, clause] }
  }

  // Niger : "Numéro de l'Acte : de X à Y" cible le numéro d'enregistrement
  // final (métadonnée générique, tous actes) — VRAIE plage numérique, chaque
  // borne étant indépendante (on peut ne renseigner que "de" ou que "à").
  // Le champ est stocké en `keyword` et le numéro est attribué séquentiellement
  // SANS zéros de remplissage (voir `generateSequentialActNumber` côté
  // countryconfig) : une clause `range` classique ferait donc une comparaison
  // lexicographique fausse ("100" < "20"). On utilise `numericRange`, traduit
  // côté indexation en requête `script` (cast numérique), plutôt que de
  // changer le mapping ES du champ (pas de migration/réindexation des actes
  // déjà enregistrés). "N° de la déclaration" est un numéro DIFFÉRENT et non
  // technique : celui attribué par le centre de déclaration et saisi en
  // premier par l'agent lors de la saisie — un champ du formulaire de
  // déclaration (`child.declarationNumber` / `deceased.declarationNumber` /
  // `husband.declarationNumber`), PAS l'identifiant de suivi interne du
  // système (`trackingId`). Ce champ n'existe que sur les 4 modèles
  // "déclaration" de base (birth/death/marriage/divorce) — absent des
  // jugements et copies conformes, voir le commentaire sur
  // `childWithDeclarationNumber` dans
  // `opencrvs-countryconfig/src/events/birth/forms/declaration.ts`.
  if (args.numeroActeFrom || args.numeroActeTo) {
    // Garde-fou : une saisie non numérique ne doit jamais atteindre le script
    // ES (NaN ne se sérialise pas proprement en JSON) — on ignore alors la
    // borne concernée plutôt que d'envoyer une valeur invalide.
    const toValidNumber = (value?: string): number | undefined => {
      if (!value) {
        return undefined
      }
      const parsed = Number(value)
      return Number.isNaN(parsed) ? undefined : parsed
    }
    const gte = toValidNumber(args.numeroActeFrom)
    const lte = toValidNumber(args.numeroActeTo)

    if (gte !== undefined || lte !== undefined) {
      const clause: QueryExpression = {
        'legalStatuses.REGISTERED.registrationNumber': {
          type: 'numericRange',
          gte,
          lte
        }
      }
      query = { type: 'and', clauses: [query, clause] }
    }
  }

  if (args.numeroDeclaration) {
    const declarationNumberClauses = args.events
      .map((event): QueryExpression | undefined => {
        const fieldId = DECLARATION_NUMBER_FIELD_BY_EVENT[event.id]
        if (!fieldId) {
          return undefined
        }
        return {
          eventType: event.id,
          data: {
            [fieldId]: { type: 'exact' as const, term: args.numeroDeclaration }
          }
        }
      })
      .filter((clause): clause is QueryExpression => Boolean(clause))

    if (declarationNumberClauses.length > 0) {
      query = {
        type: 'and',
        clauses: [query, { type: 'or', clauses: declarationNumberClauses }]
      }
    }
  }

  if (args.sexe && args.sexe !== 'all') {
    const genderClauses = args.events
      .map((event): QueryExpression | undefined => {
        const fieldId = GENDER_FIELD_BY_EVENT[event.id]
        if (!fieldId) {
          return undefined
        }
        return {
          eventType: event.id,
          data: { [fieldId]: { type: 'exact' as const, term: args.sexe } }
        }
      })
      .filter((clause): clause is QueryExpression => Boolean(clause))

    if (genderClauses.length > 0) {
      query = {
        type: 'and',
        clauses: [query, { type: 'or', clauses: genderClauses }]
      }
    }
  }

  if (args.judgmentNumber) {
    const judgmentEvents = args.events.filter(
      (event) => getEventModelKind(event.id) === 'judgment'
    )
    if (judgmentEvents.length > 0) {
      query = {
        type: 'and',
        clauses: [
          query,
          {
            type: 'or',
            clauses: judgmentEvents.map((event) => ({
              eventType: event.id,
              data: {
                'judgment.number': {
                  type: 'exact' as const,
                  term: args.judgmentNumber
                }
              }
            }))
          }
        ]
      }
    }
  }

  if (args.originalActNumber) {
    const certifiedCopyEvents = args.events.filter(
      (event) => getEventModelKind(event.id) === 'certified-copy'
    )
    if (certifiedCopyEvents.length > 0) {
      query = {
        type: 'and',
        clauses: [
          query,
          {
            type: 'or',
            clauses: certifiedCopyEvents.map((event) => ({
              eventType: event.id,
              data: {
                'originalAct.number': {
                  type: 'exact' as const,
                  term: args.originalActNumber
                }
              }
            }))
          }
        ]
      }
    }
  }

  if (args.officeId) {
    query = {
      type: 'and',
      clauses: [
        query,
        { createdAtLocation: { type: 'exact', term: args.officeId } }
      ]
    }
  }

  return query
}

/**
 * Niger : "Actions à faire" — réutilise la requête RÉELLE de la file
 * d'attente correspondante (même mécanisme que les tuiles "Aujourd'hui" de
 * la page d'accueil, `useHomeDashboardCounts.ts`/`buildTileQuery`), ET-ée
 * avec le reste des critères de la Recherche Avancée. Garantit les mêmes
 * résultats qu'en ouvrant la file directement, plutôt qu'une approximation
 * par statut.
 */
export function buildActionsAFaireQuery(
  workqueueConfig: WorkqueueConfig,
  user: UserOrSystem,
  restQuery: QueryType
): QueryType {
  return {
    type: 'and',
    clauses: [deserializeQuery(workqueueConfig.query, user), restQuery]
  }
}
