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
import { getLocationById } from '@events/service/locations/locations'
import { getUser } from '@events/service/users/api'

export interface LockedBy {
  id: string
  name: string
  officeName?: string
}

/**
 * Niger : résolution best-effort du nom + bureau de la personne qui détient
 * actuellement un acte, pour afficher "Verrouillé par {nom}, {bureau}" au
 * lieu du message générique "Vous avez été désassigné" — utilisé à la fois
 * par `requireAssignment` (conflit sur une action normale) et par
 * `assignRecord` (conflit lors d'une tentative de prise d'un acte déjà
 * assigné à quelqu'un d'autre). Si l'utilisateur/le lieu n'est plus
 * trouvable, retourne `undefined` : l'appelant doit alors garder le message
 * générique en repli.
 */
export async function resolveLockedBy(
  assignedTo: string
): Promise<LockedBy | undefined> {
  try {
    const assignedUser = await getUser(assignedTo)
    const officeName = assignedUser.primaryOfficeId
      ? (await getLocationById(assignedUser.primaryOfficeId)).name
      : undefined
    return {
      id: assignedUser.id,
      name: `${assignedUser.name.firstname} ${assignedUser.name.surname}`.trim(),
      officeName
    }
  } catch {
    return undefined
  }
}
