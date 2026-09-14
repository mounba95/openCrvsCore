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

import { TRPCClientError } from '@trpc/client'
import { trpcClient } from '@client/v2-events/trpc'
import { cacheFiles } from '@client/v2-events/features/files/cache'
import { cacheUsersFromEventDocument } from '@client/v2-events/features/users/cache'
import { setEventData } from '../../useEvents/api'

export async function prefetchPotentialDuplicates(eventId: string) {
  try {
    const potentialDuplicates = await trpcClient.event.getDuplicates.query({
      eventId
    })
    // Niger, 2026-08-22 : mis en parallèle (au lieu d'un candidat après
    // l'autre) — avec plusieurs doublons potentiels détectés (cas fréquent
    // en test, plusieurs déclarations quasi identiques), la boucle
    // séquentielle pouvait à elle seule prendre plusieurs secondes.
    await Promise.all(
      potentialDuplicates.map(async (eventDocument) => {
        await Promise.all([
          cacheFiles(eventDocument),
          cacheUsersFromEventDocument(eventDocument)
        ])
        setEventData(eventDocument.id, eventDocument)
      })
    )
  } catch (error) {
    if (
      error instanceof TRPCClientError &&
      // Niger : 409 ("You are not assigned to this event") ajouté le
      // 2026-08-22 — cette fonction tourne juste après un ASSIGN qui vient
      // de réussir (voir `createEventActionMutationFn`), donc l'utilisateur
      // EST assigné ; mais comme cette requête suit immédiatement, une
      // requête concurrente (ex. Déclarer lancé juste après) peut désassigner
      // entre-temps. Ce préchargement des doublons potentiels est un simple
      // bonus de cache, jamais critique : le faire échouer ne doit surtout
      // pas faire échouer l'ASSIGN (et par extension l'action déclenchante)
      // qui vient de réussir.
      [403, 404, 401, 409].includes(error.data?.httpStatus)
    ) {
      // Do nothing, the user is not authorized to see duplicates, or the
      // assignment changed concurrently — this is a best-effort prefetch.
    } else {
      throw error
    }
  }
}
