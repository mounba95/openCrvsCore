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
import { EventConfig, QueryType } from '@opencrvs/commons/client'
import {
  buildPerEventFieldRangeClause,
  buildQuickSearchQuery,
  getDateOfEventFieldId
} from '@client/v2-events/features/events/Search/utils'

/**
 * Niger : requête de "Recherche simple" (page d'accueil, inspirée d'INCI).
 *
 * Nom/Prénom/Numéro n'existent pas comme champs indépendamment cherchables
 * dans les 12 modèles d'actes (le champ NOM est un bloc composite unique,
 * même dans la recherche rapide existante) — on les concatène donc en un
 * seul terme et on réutilise `buildQuickSearchQuery`, déjà capable de faire
 * une correspondance floue sur les champs "nom" ET une correspondance exacte
 * sur le numéro de suivi/d'enregistrement, sans code nouveau pour cette
 * partie.
 *
 * La plage de dates cible le champ "date de l'événement" propre à CHAQUE
 * type d'acte sélectionné (lu dynamiquement via `event.dateOfEvent.$$field`,
 * jamais codé en dur — ce champ diffère par ex. entre l'acte de décès de
 * base (`eventDetails.date`) et sa copie conforme (`deceased.dateOfDeath`)).
 *
 * `officeId` : commune choisie dans le champ "Mairie" — restreint le résultat
 * à cette commune SANS jamais changer la commune active de la session (voir
 * RechercheSimple.tsx). ⚠️ Si cette commune n'est pas dans la même
 * juridiction que la commune active (`administrativeAreaId`), le filtrage
 * côté serveur par juridiction — basé sur la commune active, pas sur
 * l'ensemble des communes affectées — peut renvoyer zéro résultat malgré ce
 * filtre. Non vérifié en conditions réelles.
 */
export function buildSimpleSearchQuery(args: {
  term: string
  events: EventConfig[]
  dateOfEventRange?: { gte: string; lte: string }
  officeId?: string
}): QueryType {
  const termClause: QueryType = args.term
    ? buildQuickSearchQuery(args.term, args.events)
    : {
        type: 'or',
        clauses: args.events.map((event) => ({ eventType: event.id }))
      }

  let query = termClause

  if (args.dateOfEventRange) {
    const dateClause = buildPerEventFieldRangeClause(
      args.events,
      getDateOfEventFieldId,
      args.dateOfEventRange
    )
    if (dateClause) {
      query = { type: 'and', clauses: [query, dateClause] }
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
