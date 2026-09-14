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
import { useNavigate } from 'react-router-dom'
import React, { useCallback } from 'react'
import {
  ActionType,
  EventIndex,
  getUUID,
  ClientSpecificAction,
  WorkqueueActionType
} from '@opencrvs/commons/client'
import { useEvents } from '@client/v2-events/features/events/useEvents/useEvents'
import { ROUTES } from '@client/v2-events/routes'
import { getUsersFullName } from '@client/v2-events/utils'
import { useEventConfiguration } from '@client/v2-events/features/events/useEventConfiguration'
import { useEventFormNavigation } from '@client/v2-events/features/events/useEventFormNavigation'
import { useModal } from '@client/hooks/useModal'
import { UnassignModal } from '@client/v2-events/components/UnassignModal'
import { useUsers } from '@client/v2-events/hooks/useUsers'
import { useLocations } from '@client/v2-events/hooks/useLocations'
import { useQuickActionModal } from '@client/v2-events/features/events/actions/quick-actions/useQuickActionModal'
import { useRejectionModal } from '@client/v2-events/features/events/actions/reject/useRejectionModal'
import { useEnsureAssignedToSelf } from './useEnsureAssignedToSelf'

/**
 * Given an event,
 * @returns onClick handlers for workqueue item actions, and any modals that should be rendered alongside.
 *
 * Note: If you need assignment actions @see useAssignmentActions.
 * They are intentionally separated, since assignment actions are not used everywhere (e.g. in Workqueue CTA buttons) and have additional dependencies that can be costly to run.
 *
 */
export function useEventActionsOnClick(event: EventIndex) {
  const navigate = useNavigate()
  const {
    clearEphemeralFormState,
    deleteDeclaration,
    modal: deleteModal
  } = useEventFormNavigation()
  const { eventConfiguration } = useEventConfiguration(event.type)
  const { handleRejection, rejectionModal } = useRejectionModal(
    event.id,
    event.type
  )
  const { onQuickAction, quickActionModal } = useQuickActionModal(
    eventConfiguration,
    event
  )

  const eventId = event.id

  // Niger : le premier utilisateur qui clique sur une action prend l'acte à
  // ce moment précis — pas à la simple ouverture (voir CONTEXTE-PROJET.md).
  // Si un autre utilisateur le détient déjà, la tentative échoue (409) et le
  // message nommé "Verrouillé par {nom}" s'affiche (`action.ts`,
  // `errorToastOnConflict`) ; dans ce cas on n'enchaîne PAS sur la
  // navigation vers l'écran de l'action.
  const ensureAssignedToSelf = useEnsureAssignedToSelf(eventId)

  const onClick = useCallback(
    async (
      actionType: WorkqueueActionType | ClientSpecificAction,
      backTo?: string
    ) => {
      if (actionType !== ActionType.READ) {
        const canProceed = await ensureAssignedToSelf()
        if (!canProceed) {
          return
        }
      }
      switch (actionType) {
        case ActionType.DELETE:
          return deleteDeclaration(eventId, backTo)
        case ActionType.DECLARE:
          clearEphemeralFormState()
          return navigate(
            ROUTES.V2.EVENTS.DECLARE.REVIEW.buildPath({ eventId }, { backTo })
          )
        case ActionType.EDIT:
          clearEphemeralFormState()
          return navigate(
            ROUTES.V2.EVENTS.EDIT.REVIEW.buildPath({ eventId }, { backTo })
          )
        case ActionType.REGISTER:
          return onQuickAction(ActionType.REGISTER, backTo)
        case ActionType.ARCHIVE:
          return onQuickAction(ActionType.ARCHIVE, backTo)
        case ActionType.UNARCHIVE:
          return onQuickAction(ActionType.UNARCHIVE, backTo)
        case ActionType.PRINT_CERTIFICATE:
          clearEphemeralFormState()
          return navigate(
            ROUTES.V2.EVENTS.PRINT_CERTIFICATE.buildPath(
              { eventId },
              { backTo }
            )
          )
        case ActionType.MARK_AS_DUPLICATE:
          clearEphemeralFormState()
          return navigate(
            ROUTES.V2.EVENTS.REVIEW_POTENTIAL_DUPLICATE.buildPath(
              { eventId },
              { backTo }
            )
          )
        case ActionType.REQUEST_CORRECTION: {
          const correctionPages = eventConfiguration.actions.find(
            (action) => action.type === ActionType.REQUEST_CORRECTION
          )?.correctionForm.pages
          if (!correctionPages) {
            throw new Error('No page ID found for request correction')
          }
          clearEphemeralFormState()
          if (correctionPages.length === 0) {
            return navigate(
              ROUTES.V2.EVENTS.REQUEST_CORRECTION.REVIEW.buildPath(
                { eventId },
                { backTo }
              )
            )
          }
          return navigate(
            ROUTES.V2.EVENTS.REQUEST_CORRECTION.ONBOARDING.buildPath(
              { eventId, pageId: correctionPages[0].id },
              { backTo }
            )
          )
        }
        case ClientSpecificAction.REVIEW_CORRECTION_REQUEST:
          clearEphemeralFormState()
          return navigate(
            ROUTES.V2.EVENTS.REVIEW_CORRECTION.REVIEW.buildPath(
              { eventId },
              { backTo }
            )
          )
        case ActionType.REJECT:
          return handleRejection(() =>
            backTo ? navigate(backTo) : navigate(ROUTES.V2.buildPath({}))
          )
        case ActionType.READ:
          return navigate(
            ROUTES.V2.EVENTS.EVENT.RECORD.buildPath({ eventId }, { backTo })
          )
      }
    },
    [
      eventId,
      deleteDeclaration,
      clearEphemeralFormState,
      navigate,
      onQuickAction,
      eventConfiguration,
      handleRejection,
      ensureAssignedToSelf
    ]
  )

  return {
    onClick,
    modals: [deleteModal, rejectionModal, quickActionModal]
  }
}

/**
 * Given an event,
 * @returns handlers for assignment actions, and any modals that should be rendered alongside.
 *
 * Note: If you need event actions @see useEventActionsOnClick.
 * They are intentionally separated, since assignment actions are not used everywhere (e.g. in Workqueue CTA buttons) and have additional dependencies that can be costly to run.
 *
 */
export function useAssignmentActions(event: EventIndex) {
  const events = useEvents()
  const { getUsers } = useUsers()
  const { getLocations } = useLocations()
  const locations = getLocations.useSuspenseQuery()
  const assignedToUser = getUsers.useQueryById(event.assignedTo || '', {
    enabled: !!event.assignedTo
  })
  const assignedUserFullName = assignedToUser.data
    ? getUsersFullName(assignedToUser.data.name)
    : null
  const assignedOffice = assignedToUser.data?.primaryOfficeId
  const assignedOfficeName =
    (assignedOffice && locations.get(assignedOffice)?.name) || ''
  const [modal, openModal] = useModal()

  // Niger : ce déblocage ne sert plus qu'à l'OEC/admin qui libère un acte
  // assigné à quelqu'un d'autre (`record.unassign-others`) — l'auto-
  // désassignation de soi-même n'a plus de déclencheur manuel (voir
  // CONTEXTE-PROJET.md).
  const onUnassign = useCallback(async () => {
    const unassign = await openModal<boolean>((close) => (
      <UnassignModal
        close={close}
        name={assignedUserFullName}
        officeName={assignedOfficeName}
      />
    ))
    if (!unassign) {
      return
    }
    await events.actions.assignment.unassign.mutateAsync({
      eventId: event.id,
      transactionId: getUUID(),
      assignedTo: null
    })
  }, [openModal, assignedUserFullName, assignedOfficeName, events, event.id])

  return { onUnassign, modal }
}
