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
  ActionType,
  AssignmentStatus,
  ClientSpecificAction,
  DisplayableAction,
  EventConfig,
  EventIndex,
  EventStatus,
  filterActionsByFlags,
  getActionConfig,
  getAssignmentStatus,
  getAvailableActionsForEvent,
  getOrThrow,
  isActionEnabled,
  isActionVisible,
  ITokenPayload,
  ValidatorContext,
  WorkqueueActionType
} from '@opencrvs/commons/client'
import { ActionMenuActionType } from './utils'

/**
 * Niger : l'assignation manuelle (clic "S'assigner") a été retirée — un acte
 * ne s'assigne plus à l'ouverture/consultation. Le premier utilisateur qui
 * clique sur une action (déclarer/valider/imprimer...) prend l'acte à ce
 * moment-là (voir `useEventActionsOnClick.tsx`) ; les boutons d'action
 * restent donc actifs pour tout le monde, la prise se joue au clic, pas à
 * l'affichage. Le seul cas où une action d'assignation reste proposée dans
 * l'UI est le déblocage d'un acte détenu par quelqu'un d'autre (`UNASSIGN`),
 * réservé à l'OEC/aux admins via le scope `record.unassign-others` (déjà
 * appliqué par `isActionInScope`, aucun changement d'autorisation nécessaire
 * ici).
 */
export const STATUSES_THAT_CAN_BE_ASSIGNED: EventStatus[] = [
  EventStatus.enum.NOTIFIED,
  EventStatus.enum.DECLARED,
  EventStatus.enum.REGISTERED,
  EventStatus.enum.ARCHIVED
]

function getAvailableAssignmentActions(
  event: EventIndex,
  authentication: ITokenPayload
) {
  const assignmentStatus = getAssignmentStatus(event, authentication.sub)
  const eventStatus = event.status

  if (!STATUSES_THAT_CAN_BE_ASSIGNED.includes(eventStatus)) {
    return []
  }

  if (assignmentStatus !== AssignmentStatus.ASSIGNED_TO_OTHERS) {
    return []
  }

  return filterActionsByFlags([ActionType.UNASSIGN], event.flags)
}

/**
 * Resolves "internal" conditionals for actions. e.g. ensures user is online when needed.
 *
 * Niger : ces actions ne sont plus conditionnées à l'assignation actuelle de
 * l'acte — un bouton reste actif pour tout utilisateur ayant par ailleurs le
 * droit d'agir (scope/statut/visibilité, calculés séparément). C'est le clic
 * lui-même qui tente de prendre l'acte (`useEventActionsOnClick.tsx`) ; si
 * quelqu'un d'autre le détient déjà, la tentative échoue à ce moment-là et le
 * message nommé apparaît — un bouton grisé sans explication n'a plus lieu
 * d'être.
 */
function resolveInternalActionConditions({
  actionType,
  isOnline,
  isDeclareDraftOpen
}: {
  actionType: WorkqueueActionType | ActionMenuActionType
  isOnline: boolean
  isDeclareDraftOpen: boolean
}): {
  enabled: boolean
  visible: boolean
} {
  switch (actionType) {
    case ActionType.UNASSIGN:
    case ActionType.ARCHIVE:
    case ActionType.UNARCHIVE:
    case ActionType.DELETE:
    case ActionType.EDIT:
    case ActionType.REJECT:
    case ActionType.REGISTER:
    case ActionType.PRINT_CERTIFICATE:
    case ActionType.REQUEST_CORRECTION:
    case ClientSpecificAction.REVIEW_CORRECTION_REQUEST:
    case ActionType.MARK_AS_DUPLICATE:
      return { enabled: isOnline, visible: true }
    case ActionType.DECLARE:
      return {
        enabled: isOnline || isDeclareDraftOpen,
        visible: true
      }
    case ActionType.READ:
      return { enabled: true, visible: true }
    default:
      throw new Error(
        `Unknown action type ${actionType} when resolving internal action conditionals`
      )
  }
}

/**
 * Given event and action type, determines if the action should be enabled and visible for the user.
 */
export function resolveActionConditionals({
  event,
  actionType,
  isDeclareDraftOpen,
  validatorContext,
  isActionAllowedForUser,
  eventConfiguration,
  isOnline
}: {
  event: EventIndex
  actionType: WorkqueueActionType | ActionMenuActionType
  isDeclareDraftOpen: boolean
  validatorContext: ValidatorContext
  isActionAllowedForUser: (action: DisplayableAction) => boolean
  eventConfiguration: EventConfig
  isOnline: boolean
}): {
  enabled: boolean
  visible: boolean
} {
  const user = getOrThrow(
    validatorContext.user,
    'Cannot determine action conditionals without user information'
  )

  const availableEventActions = getAvailableActionsForEvent(event)
  const availableAssignActions = getAvailableAssignmentActions(event, user)
  // 1. Gather all available actions for the event, including assignment actions
  const allAvailableActions = [
    ...availableEventActions,
    ...availableAssignActions
  ]

  // 2. Check if the action is available for the event at all.
  const actionIsAvailableForEvent = allAvailableActions.includes(actionType)
  // 3. Check if the user can perform it.
  // For DECLARE, also allow users with NOTIFY scope — they can enter the declare form
  // and submit as NOTIFY. Mirrors the same logic in DeclarationAction.tsx.
  const actionIsAllowedForUser =
    actionType === ActionType.DECLARE
      ? isActionAllowedForUser(ActionType.DECLARE) ||
        isActionAllowedForUser(ActionType.NOTIFY)
      : isActionAllowedForUser(actionType)
  const actionConfig = getActionConfig({ eventConfiguration, actionType })

  // 4. Check if the action is enabled/visible based on the configuration conditionals.
  const isVisible = actionConfig
    ? isActionVisible(actionConfig, event, validatorContext)
    : true
  const isEnabled = actionConfig
    ? isActionEnabled(actionConfig, event, validatorContext)
    : true

  // 5. Combine all the above to determine if the action should be enabled and visible as the base result.
  const baseEnabled =
    actionIsAvailableForEvent && actionIsAllowedForUser && isEnabled
  const baseVisible =
    actionIsAvailableForEvent && actionIsAllowedForUser && isVisible

  // 6. Run hardcoded internal business rules.
  const internalConditions = resolveInternalActionConditions({
    actionType,
    isOnline,
    isDeclareDraftOpen
  })

  return {
    enabled: baseEnabled && internalConditions.enabled,
    visible: baseVisible && internalConditions.visible
  }
}
