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
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@client/v2-events/routes'
import { createTemporaryId } from '@client/v2-events/utils'
import { getUserDetails } from '@client/profile/profileSelectors'
import { useEvents } from './useEvents/useEvents'
import { useEventFormData } from './useEventFormData'
import { useActionAnnotation } from './useActionAnnotation'

/**
 * Crée un nouvel événement du type donné puis navigue directement vers son
 * formulaire de déclaration — sans passer par l'écran de sélection. Utilisé
 * quand le type d'événement est déjà connu (ex: un acte n'a qu'un seul
 * modèle disponible, voir `actGroups.tsx` et `CreateEventCards.tsx`).
 */
export function useCreateEventAndNavigate() {
  const navigate = useNavigate()
  const events = useEvents()
  const createEvent = events.createEvent()
  const clearForm = useEventFormData((state) => state.clear)
  const clearAnnotation = useActionAnnotation((state) => state.clear)
  const user = useSelector(getUserDetails)

  return function createEventAndNavigate(eventType: string) {
    const transactionId = createTemporaryId()

    createEvent.mutate({
      type: eventType,
      transactionId,
      createdAtLocation: user?.primaryOfficeId
    })

    clearForm()
    clearAnnotation()

    navigate(ROUTES.V2.EVENTS.DECLARE.buildPath({ eventId: transactionId }))
  }
}
