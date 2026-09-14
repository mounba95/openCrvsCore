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

import React, { PropsWithChildren, useEffect, useMemo, useRef } from 'react'
import { useTypedParams } from 'react-router-typesafe-routes/dom'
import { useNavigate } from 'react-router-dom'
import {
  createEmptyDraft,
  findActiveDraftForEvent,
  getActionAnnotation,
  ActionType,
  deepMerge,
  getUUID,
  deepDropNulls,
  mergeDrafts,
  EventDocument,
  EventConfig,
  getAvailableActionsForEvent,
  getCurrentEventState,
  applyDraftToEventIndex
} from '@opencrvs/commons/client'
import { withSuspense } from '@client/v2-events/components/withSuspense'
import { useEventFormData } from '@client/v2-events/features/events/useEventFormData'
import { useActionAnnotation } from '@client/v2-events/features/events/useActionAnnotation'
import { useDrafts } from '@client/v2-events/features/drafts/useDrafts'
import { createTemporaryId } from '@client/v2-events/utils'
import { useEvents } from '@client/v2-events/features/events/useEvents/useEvents'
import { ROUTES } from '@client/v2-events/routes'
import { NavigationStack } from '@client/v2-events/components/NavigationStack'
import { useUserAllowedActions } from '@client/v2-events/features/workqueues/Actions/useUserAllowedActions'
import { useToastAndRedirect } from '@client/v2-events/features/events/useToastAndRedirect'
import { useEventConfiguration } from '../../useEventConfiguration'
import { isLastActionCorrectionRequest } from '../../actions/correct/utils'
import {
  AvailableActionTypes,
  getAnnotationForActionType,
  getPreviousDeclarationActionType
} from './utils'

/**
 *
 * @param actionType Action type of the declaration action
 * @param event Event document
 * @param configuration Event configuration
 *
 * If the action is not allowed for the event, redirect the user to overview page.
 * Or throws an error if the user does not have permission to perform the action.
 */
function useActionGuard(
  actionType: AvailableActionTypes,
  event: EventDocument,
  configuration: EventConfig
) {
  const eventState = getCurrentEventState(event, configuration)
  const availableActions = getAvailableActionsForEvent(eventState)
  const { isActionAllowed } = useUserAllowedActions(eventState)
  const { redirectToEventOverviewPage } = useToastAndRedirect()
  // If the action is not available for the event, redirect to the overview page
  if (!availableActions.includes(actionType)) {
    // Some Storybook tests expect the action guard to throw errors.
    // Storybook verifies behavior based on these development-mode failures.
    const isStory = import.meta.env.STORYBOOK

    /**
     * Niger : ce cas (action déjà indisponible — ex. une correction déjà en
     * attente sur l'acte) est un état NORMAL, pas une erreur de
     * développement à traquer — un utilisateur peut légitimement retomber
     * dessus (retour arrière, onglet resté ouvert...). Avant, seul le mode
     * production affichait un message propre + redirection ; le mode
     * développement plantait (`throw`), ce qui semait la confusion lors des
     * tests (2026-08-11). On garde le `throw` uniquement pour Storybook, qui
     * en a besoin pour ses tests — partout ailleurs (dev compris), on
     * affiche le message et on redirige, comme en production.
     */
    if (!isStory) {
      // Show a toast explaining why the action is not available
      // and then redirect to the overview page
      return redirectToEventOverviewPage({
        toastId: `${actionType}-no-available-for-${event.id}`,
        message: {
          id: 'event.action.notAvailableForEvent',
          defaultMessage:
            "The action you're trying to perform is not available for this event anymore.",
          description:
            'Shown when user tries to perform an action that is not available for the event'
        },
        eventId: event.id
      })
    }

    throw new Error(
      `Action ${actionType} not available for the event ${event.id} with status ${eventState.status} ${eventState.flags.length > 0 ? `(flags: ${eventState.flags.join(', ')})` : ''}`
    )
  }

  // In the declare flow, user is allowed if they have permission for either DECLARE or NOTIFY;
  // otherwise strict permission by action type.
  const isPermitted =
    actionType === ActionType.DECLARE
      ? isActionAllowed(ActionType.DECLARE) ||
        isActionAllowed(ActionType.NOTIFY)
      : isActionAllowed(actionType)

  if (!isPermitted) {
    throw new Error(
      `User does not have permission to perform action ${actionType} on event ${event.id}`
    )
  }
}

/**
 * Creates a wrapper component for the declaration action.
 * Manages the state of the declaration action and its local draft.
 *
 * Declaration action modifies the declaration. The action can add annotation to the declaration.
 * Declaration action is triggered only once. Declaration state is generated from series of declaration actions and drafts.
 *
 * This differs from AnnotationAction, which modify the annotation, and can be triggered multiple times.
 */
function DeclarationActionComponent({
  children,
  actionType,
  event
}: PropsWithChildren<{
  actionType: AvailableActionTypes
  event: EventDocument
}>) {
  const eventId = event.id
  const { setLocalDraft, getLocalDraftOrDefault, getRemoteDraftByEventId } =
    useDrafts()

  const { eventConfiguration: configuration } = useEventConfiguration(
    event.type
  )

  useActionGuard(actionType, event, configuration)

  const remoteDraft = getRemoteDraftByEventId(event.id)

  const activeRemoteDraft = remoteDraft
    ? findActiveDraftForEvent(event, remoteDraft)
    : undefined

  const localDraft = getLocalDraftOrDefault(
    activeRemoteDraft
      ? // new transactionId must be generated for the draft to be saved. Otherwise it will hit the "idempotency wall"
        { ...activeRemoteDraft, transactionId: getUUID() }
      : createEmptyDraft(eventId, createTemporaryId(), actionType)
  )

  /*
   * Keep the local draft updated as per the form changes
   */
  const currentDeclaration = useEventFormData((state) => state.formValues)
  const currentAnnotation = useActionAnnotation((state) => state.annotation)

  useEffect(() => {
    if (!currentDeclaration || !currentAnnotation) {
      return
    }

    setLocalDraft({
      ...localDraft,
      eventId: event.id,
      action: {
        ...localDraft.action,
        declaration: currentDeclaration,
        annotation: currentAnnotation
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDeclaration, currentAnnotation])

  /*
   * Initialize the form state
   */
  const setFormValues = useEventFormData((state) => state.setFormValues)
  const setAnnotation = useActionAnnotation((state) => state.setAnnotation)

  const localDraftWithAdjustedTimestamp = {
    ...localDraft,
    /*
     * Force the local draft always to be the latest
     * This is to prevent a situation where the local draft gets created,
     * then a CREATE action request finishes in the background and is stored with a later
     * timestamp
     */
    createdAt: new Date().toISOString(),
    /*
     * If params.eventId changes (from tmp id to concrete id) then change the local draft id
     */
    eventId: event.id,
    action: {
      ...localDraft.action,
      createdAt: new Date().toISOString()
    }
  }

  const mergedDraft = activeRemoteDraft
    ? mergeDrafts(activeRemoteDraft, localDraftWithAdjustedTimestamp)
    : localDraftWithAdjustedTimestamp

  const eventStateWithDraftApplied = applyDraftToEventIndex(
    getCurrentEventState(event, configuration),
    mergedDraft,
    configuration
  )

  const actionAnnotation = useMemo(() => {
    // For correction request, if we are not reviewing a correction, we don't want to use any previous action annotation
    if (
      actionType === ActionType.REQUEST_CORRECTION &&
      !isLastActionCorrectionRequest(event)
    ) {
      return deepDropNulls(mergedDraft.action.annotation || {})
    }

    return getActionAnnotation({
      event,
      actionType,
      draft: mergedDraft
    })
  }, [mergedDraft, event, actionType])

  const previousActionAnnotation = useMemo(() => {
    const previousActionType = getPreviousDeclarationActionType(
      event.actions,
      actionType
    )

    if (!previousActionType) {
      return {}
    }

    return getAnnotationForActionType({ event, actionType: previousActionType })
  }, [event, actionType])

  useEffect(() => {
    // Use the form values from the zustand state, so that filled form state is not lost
    // If user e.g. enters the 'screen lock' flow while filling form.
    // Then use form values from drafts.
    const initialFormValues = deepMerge(
      currentDeclaration || {},
      eventStateWithDraftApplied.declaration
    )

    setFormValues(initialFormValues)

    const initialAnnotation = deepMerge(
      deepMerge(currentAnnotation || {}, previousActionAnnotation),
      actionAnnotation
    )

    setAnnotation(initialAnnotation)

    /*
     * This is fine to only run once on mount and unmount as
     * At the point of this code being run, there absolutely must be an event that has already been
     * fetched of which data can be used to initialise the form
     */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <NavigationStack>{children}</NavigationStack>
}

/**
 * Container for Declaration Action. Interacts with router state and cache.
 * Having all the logic in single component breaks the rules of hooks.
 *
 */
function DeclarationActionContainer({
  children,
  actionType
}: PropsWithChildren<{
  actionType: AvailableActionTypes
}>) {
  const { eventId } = useTypedParams(ROUTES.V2.EVENTS.DECLARE.PAGES)
  const events = useEvents()

  const navigate = useNavigate()
  const { redirectToEventOverviewPage } = useToastAndRedirect()
  const event = events.getEvent.useFindEventFromCache(eventId).data

  // Niger, 2026-09-13 : distingue "l'acte n'a jamais été en cache" (les 2 cas
  // ci-dessous, où la redirection défensive a du sens) de "l'acte VIENT de
  // disparaître du cache" — ce second cas arrive en plein succès de
  // Déclarer/Valider/Enregistrer : `onSuccess` supprime l'acte local
  // (`deleteLocalEventAndToastOnDuplicate`) avant que la navigation propre à
  // cette action (voir `handleDeclaration`, déjà en cours) n'ait fini de
  // sortir de cette page. Sans cette distinction, ce composant réagissait à
  // la disparition transitoire avec son propre `navigate(-1)`, qui rejouait
  // en cascade tout l'historique des pages du formulaire — perçu comme un
  // clignotement — avant que la navigation prévue ne reprenne la main.
  const hasHadEvent = useRef<{ eventId: string; hadEvent: boolean }>({
    eventId,
    hadEvent: false
  })
  if (hasHadEvent.current.eventId !== eventId) {
    hasHadEvent.current = { eventId, hadEvent: false }
  }
  if (event) {
    hasHadEvent.current.hadEvent = true
  }

  // Missing event should not happen in "regular" application flow.
  // 1. User clicks browser 'back' button after completing flow.
  // 2. User comes directly through the URL to the flow.
  useEffect(() => {
    if (!event && !hasHadEvent.current.hadEvent) {
      // eslint-disable-next-line no-console
      console.warn(`Event with id ${eventId} not found in cache.`)

      const reduxHistoryIndex = window.history.state?.idx
      const appHasHistory =
        typeof reduxHistoryIndex === 'number' && reduxHistoryIndex > 0

      // As long as there is a page, go back to it.
      if (appHasHistory) {
        navigate(-1)

        return
      }

      // Technically, user can end up within <NavigationStack> from any page. At least from workqueue and overview pages.
      redirectToEventOverviewPage({
        toastId: `${eventId}-not-found`,
        message: {
          id: 'event.not.downloaded',
          defaultMessage:
            'Please ensure the event is first assigned and downloaded to the browser.',
          description:
            'Shown when user tries to perform an action on event that is not available '
        },
        eventId
      })
    }
  }, [event, eventId, redirectToEventOverviewPage, navigate])

  if (!event) {
    return <div />
  }

  return (
    <DeclarationActionComponent actionType={actionType} event={event}>
      {children}
    </DeclarationActionComponent>
  )
}

export const DeclarationAction = withSuspense(DeclarationActionContainer)
