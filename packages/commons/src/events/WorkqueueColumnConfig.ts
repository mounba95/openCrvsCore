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

import * as z from 'zod/v4'
import { TranslationConfig } from './TranslationConfig'
import { EventMetadataKeysArray } from './EventMetadata'

export const WorkqueueColumnKeysArray = [
  ...EventMetadataKeysArray,
  'title',
  'outbox',
  // Niger : clé synthétique, non native d'EventMetadata — calculée côté
  // client à partir de `legalStatuses.REGISTERED.registrationNumber`
  // (imbriqué, donc non adressable directement par la clé `legalStatuses`
  // brute). Voir SearchResult/utils.tsx, processEventsToRows().
  'registrationNumber'
] as const
export const WorkqueueColumnKeys = z.enum(WorkqueueColumnKeysArray)
export type WorkqueueColumnKeys = z.infer<typeof WorkqueueColumnKeys>

/**
 * Niger : référence un champ de DÉCLARATION (pas une métadonnée
 * d'événement) — soit le même id de champ pour tous les types
 * d'événement, soit un id différent par type d'événement (le cas courant,
 * une file de travail mélangeant souvent naissance/décès/mariage/divorce,
 * chacun avec son propre schéma de déclaration). Si le type d'événement de
 * la ligne n'a pas d'entrée dans la map, ou si le champ résolu n'existe
 * pas dans son schéma de déclaration, la cellule reste vide (jamais
 * d'erreur) — voir SearchResult/utils.tsx.
 */
export const WorkqueueColumnDeclarationValue = z.object({
  $declaration: z.union([z.string(), z.record(z.string(), z.string())])
})
export type WorkqueueColumnDeclarationValue = z.infer<
  typeof WorkqueueColumnDeclarationValue
>

/**
 * Niger : libellé statique (pas une donnée de déclaration) affiché selon
 * le type d'événement de la ligne — ex. la colonne "Rôle"
 * ("Intéressé"/"Epoux"/"Défunt"...). Vide si le type d'événement de la
 * ligne n'a pas d'entrée dans la map.
 */
export const WorkqueueColumnRoleLabelValue = z.object({
  $roleLabel: z.record(z.string(), TranslationConfig)
})
export type WorkqueueColumnRoleLabelValue = z.infer<
  typeof WorkqueueColumnRoleLabelValue
>

export const WorkqueueColumnValue = z.union([
  z.object({ $event: WorkqueueColumnKeys }),
  WorkqueueColumnDeclarationValue,
  WorkqueueColumnRoleLabelValue
])
export type WorkqueueColumnValue = z.infer<typeof WorkqueueColumnValue>

/**
 * Configuration for column header and value of cell of workqueue.
 */
export const WorkqueueColumn = z
  .object({
    label: TranslationConfig,
    value: WorkqueueColumnValue,
    /**
     * Niger : largeur de colonne en pourcentage, pour ajuster les colonnes
     * dont le contenu est bien plus court ou plus long que la largeur par
     * défaut (ex. "Date de l'événement" vs "Documents"). Optionnel — la
     * largeur par défaut du client s'applique si absent.
     */
    width: z.number().optional()
  })
  .meta({
    id: 'WorkqueueColumn',
    description:
      'Configuration for a single workqueue column. The value references either an event metadata key (e.g. `dateOfEvent`, `status`, `trackingId`), a declaration field id (optionally mapped per event type), or a static per-event-type label.'
  })
export type WorkqueueColumn = z.infer<typeof WorkqueueColumn>
export type WorkqueueColumnInput = z.infer<typeof WorkqueueColumn>

export function defineWorkqueuesColumns(
  workqueueColumns: WorkqueueColumnInput[]
) {
  return workqueueColumns.map((workqueueColumn) =>
    WorkqueueColumn.parse(workqueueColumn)
  )
}
