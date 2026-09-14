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

import { TRPCError } from '@trpc/server'
import { getAcceptedScopesFromToken, TokenWithBearer } from '@opencrvs/commons'
import {
  ActionStatus,
  ActionType,
  AssignActionInput,
  findLastAssignmentAction,
  getCurrentEventState,
  userCanAccessEventWithScopes
} from '@opencrvs/commons/events'
import { TrpcUserContext } from '@events/context'
import { getEventConfigurationById } from '@events/service/config/config'
import { getEventById, processAction } from '@events/service/events/events'
import { getEventIndexWithAdministrativeHierarchy } from '@events/service/indexing/utils'
import { resolveLockedBy } from '@events/service/events/lockedBy'

export async function assignRecord({
  user,
  token,
  input
}: {
  user: TrpcUserContext
  token: TokenWithBearer
  input: AssignActionInput
}) {
  const storedEvent = await getEventById(input.eventId)
  const configuration = await getEventConfigurationById({
    token,
    eventType: storedEvent.type
  })
  const lastAssignmentAction = findLastAssignmentAction(storedEvent.actions)

  if (lastAssignmentAction?.type === ActionType.ASSIGN) {
    if (lastAssignmentAction.assignedTo === input.assignedTo) {
      return storedEvent
    }

    // Niger : un acte déjà détenu par quelqu'un d'autre peut être repris
    // directement (sans passer par "Débloquer cet acte" d'abord) par un
    // utilisateur ayant le scope `record.unassign-others` (OEC/admins) — même
    // logique d'autorisation que `unassignRecord`, juste appliquée à la
    // réassignation plutôt qu'au retrait pur : l'admin doit pouvoir agir
    // immédiatement sur un acte verrouillé par un autre, pas seulement le
    // débloquer puis le rouvrir.
    const acceptedScopes = getAcceptedScopesFromToken(token, [
      'record.unassign-others'
    ])

    // Niger : même enrichissement que `requireAssignment` — sans lockedBy,
    // le client affiche le message générique "Vous avez été désassigné",
    // trompeur ici puisque l'utilisateur n'a en réalité jamais été assigné
    // (voir CONTEXTE-PROJET.md).
    const lockedBy = await resolveLockedBy(lastAssignmentAction.assignedTo)

    if (acceptedScopes.length === 0) {
      throw new TRPCError({
        code: 'CONFLICT',
        cause: lockedBy ? { lockedBy } : undefined
      })
    }

    const eventIndex = getCurrentEventState(storedEvent, configuration)
    const eventIndexWithLocationHierarchy =
      await getEventIndexWithAdministrativeHierarchy(configuration, eventIndex)

    const hasAccess = userCanAccessEventWithScopes(
      eventIndexWithLocationHierarchy,
      acceptedScopes,
      user
    )

    if (!hasAccess) {
      throw new TRPCError({
        code: 'CONFLICT',
        cause: lockedBy ? { lockedBy } : undefined
      })
    }
  }

  return processAction(input, {
    eventId: storedEvent.id,
    user,
    token,
    status: ActionStatus.Accepted,
    configuration
  })
}
