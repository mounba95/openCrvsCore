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
import { useCallback } from 'react'
import {
  UUID,
  getAcceptedActions,
  getAssignedUserFromActions
} from '@opencrvs/commons/client'
import { useEvents } from '@client/v2-events/features/events/useEvents/useEvents'
import { useAuthentication } from '@client/utils/userUtils'

/**
 * Niger : claims (assigne + télécharge) l'acte pour l'utilisateur courant au
 * premier clic — même logique que useEventActionsOnClick pour les actions
 * standard (voir CONTEXTE-PROJET.md : le premier utilisateur qui clique sur
 * une action prend l'acte à ce moment-là, pas à l'ouverture). Partagée ici
 * pour que les actions personnalisées (ex: VALIDATE_DECLARATION) suivent la
 * même règle au lieu d'exiger une assignation préalable via une autre action.
 */
export function useEnsureAssignedToSelf(eventId: UUID) {
  const maybeAuth = useAuthentication()
  const events = useEvents()
  const { useFindEventFromCache } = events.getEvent
  const cachedEvent = useFindEventFromCache(eventId)

  return useCallback(async () => {
    if (!maybeAuth) {
      return false
    }
    // Niger, 2026-09-13 : évite un aller-retour assign+refetch inutile (et
    // le clignotement visuel qu'il provoquait sur la page de révision)
    // quand l'acte est déjà assigné à l'utilisateur courant — cas le plus
    // fréquent, puisqu'il faut déjà être assigné pour ouvrir cette page.
    const cachedFullEvent = cachedEvent.data
    if (cachedFullEvent && 'actions' in cachedFullEvent) {
      const alreadyAssignedToSelf =
        getAssignedUserFromActions(getAcceptedActions(cachedFullEvent)) ===
        maybeAuth.sub
      if (alreadyAssignedToSelf) {
        return true
      }
    }
    try {
      await events.actions.assignment.assign.mutateAsync({
        eventId,
        assignedTo: maybeAuth.sub,
        refetchEvent: cachedEvent.refetch
      })
      return true
    } catch {
      return false
    }
  }, [maybeAuth, events, eventId, cachedEvent.data, cachedEvent.refetch])
}
