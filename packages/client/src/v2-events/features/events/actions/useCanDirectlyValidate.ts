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
import {
  isActionAvailable,
  ActionType,
  TokenUserType,
  getCurrentEventState,
  getActionConfig,
  EventDocument,
  UUID
} from '@opencrvs/commons/client'
import { getUserDetails } from '@client/profile/profileSelectors'
import { useValidatorContext } from '@client/v2-events/hooks/useValidatorContext'
import { useEventFormData } from '@client/v2-events/features/events/useEventFormData'
import { useActionAnnotation } from '@client/v2-events/features/events/useActionAnnotation'
import { useCurrentUser } from '@client/v2-events/hooks/useCurrentUser'
import { useEventConfiguration } from '../useEventConfiguration'

/**
 * Niger : équivalent de useCanDirectlyRegister, mais pour l'action
 * personnalisée VALIDATE_DECLARATION — l'Agent Vérificateur n'a pas le scope
 * record.register mais peut valider directement sa propre déclaration
 * (déclarer + valider en un clic), pour que l'acte parte tout de suite dans
 * la file de l'OEC au lieu de rester dans "pending-validation".
 */
export function useCanDirectlyValidate(event: EventDocument) {
  const userDetails = useSelector(getUserDetails)
  const { currentUser } = useCurrentUser()
  const validatorContext = useValidatorContext()
  const { eventConfiguration } = useEventConfiguration(event.type)
  const declaration = useEventFormData((state) => state.getFormValues())
  const { getAnnotation } = useActionAnnotation()
  const annotation = getAnnotation()

  if (!userDetails) {
    return false
  }

  const currentEventIndex = getCurrentEventState(event, eventConfiguration)
  const declareActionConfig = getActionConfig({
    eventConfiguration,
    actionType: ActionType.DECLARE
  })

  // If 'Declare' action conditions are not met, we should not allow the direct validate
  if (
    !declareActionConfig ||
    !isActionAvailable(declareActionConfig, currentEventIndex, validatorContext)
  ) {
    return false
  }

  const eventAfterDeclare = {
    ...event,
    actions: event.actions.concat({
      type: ActionType.DECLARE,
      id: 'placeholder' as UUID,
      transactionId: 'placeholder' as UUID,
      createdByUserType: TokenUserType.enum.user,
      createdByRole: userDetails.role,
      declaration,
      annotation,
      createdAt: new Date().toISOString(),
      createdBy: userDetails.id,
      originalActionId: null,
      status: 'Accepted',
      createdBySignature: undefined,
      // Niger : commune ACTIVE (bascule sans reconnexion), pas la commune
      // permanente — voir useCurrentUser.ts.
      createdAtLocation: currentUser.primaryOfficeId
    })
  }

  const eventIndexAfterDeclare = getCurrentEventState(
    eventAfterDeclare,
    eventConfiguration
  )

  const validateActionConfig = getActionConfig({
    eventConfiguration,
    actionType: ActionType.CUSTOM,
    customActionType: 'VALIDATE_DECLARATION'
  })

  if (!validateActionConfig) {
    return false
  }

  return isActionAvailable(
    validateActionConfig,
    eventIndexAfterDeclare,
    validatorContext
  )
}
