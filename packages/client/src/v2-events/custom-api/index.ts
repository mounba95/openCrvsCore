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
  ActionUpdate,
  EventState,
  getUUID,
  ActionType,
  getCurrentEventState,
  omitHiddenAnnotationFields,
  EventDocument,
  EventConfig,
  ArchiveActionInput,
  MarkAsDuplicateActionInput,
  ActionStatus,
  ValidatorContext
} from '@opencrvs/commons/client'
import { trpcClient } from '@client/v2-events/trpc'

// Defines custom API functions that are not part of the generated API from TRPC.

export interface CustomMutationParams {
  eventId: string
  declaration: EventState
  transactionId: string
  eventConfiguration: EventConfig
  annotation?: EventState
  /**
   * Values collected from the final action's confirmation dialog form
   * (e.g. REGISTER's fields in a declare+register flow). Merged into the
   * final action's annotation only, so intermediate actions don't store
   * another action's dialog metadata.
   */
  targetActionAnnotation?: ActionUpdate
}

export interface CorrectionRequestParams extends CustomMutationParams {
  event: EventDocument
  context: ValidatorContext
}

export interface ArchiveOnDuplicateParams extends CustomMutationParams {
  content: ArchiveActionInput['content'] &
    Partial<MarkAsDuplicateActionInput['content']>
}

function hasPotentialDuplicates(
  event: EventDocument,
  eventConfiguration: EventConfig
) {
  const eventIndex = getCurrentEventState(event, eventConfiguration)
  return eventIndex.potentialDuplicates.length > 0
}

function wasRejected(event: EventDocument, actionType: ActionType): boolean {
  return (
    event.actions.filter((a) => a.type === actionType).at(-1)?.status ===
    ActionStatus.Rejected
  )
}

/**
 * Runs a sequence of actions from declare to register.
 *
 * Defining the function here, statically allows offline support.
 * Moving the function to one level up will break offline support since the definition needs to be static.
 */
export async function registerOnDeclare({
  eventId,
  eventConfiguration,
  declaration,
  transactionId,
  annotation,
  targetActionAnnotation
}: CustomMutationParams) {
  const declaredEvent = await trpcClient.event.actions.declare.request.mutate({
    declaration,
    annotation,
    eventId,
    transactionId,
    keepAssignmentIfAccepted: true
  })

  if (
    hasPotentialDuplicates(declaredEvent, eventConfiguration) ||
    wasRejected(declaredEvent, ActionType.DECLARE)
  ) {
    return declaredEvent
  }

  return trpcClient.event.actions.register.request.mutate({
    declaration: {},
    annotation: { ...annotation, ...targetActionAnnotation },
    eventId,
    transactionId
  })
}

/**
 * Niger : équivalent de registerOnDeclare, mais pour l'Agent Vérificateur qui
 * n'a pas le scope record.register — déclare puis enchaîne directement sur
 * l'action personnalisée VALIDATE_DECLARATION, pour que l'acte parte
 * directement dans la file de l'OEC (pending-registration) sans repasser par
 * "pending-validation" que l'Agent Vérificateur vient lui-même de créer.
 */
export async function declareAndValidate({
  eventId,
  eventConfiguration,
  declaration,
  transactionId,
  annotation,
  targetActionAnnotation
}: CustomMutationParams) {
  const declaredEvent = await trpcClient.event.actions.declare.request.mutate({
    declaration,
    annotation,
    eventId,
    transactionId,
    keepAssignmentIfAccepted: true
  })

  if (
    hasPotentialDuplicates(declaredEvent, eventConfiguration) ||
    wasRejected(declaredEvent, ActionType.DECLARE)
  ) {
    return declaredEvent
  }

  return trpcClient.event.actions.custom.request.mutate({
    eventId,
    customActionType: 'VALIDATE_DECLARATION',
    declaration: {},
    transactionId,
    annotation: { ...annotation, ...targetActionAnnotation }
  })
}

export async function editAndRegister({
  eventId,
  declaration,
  transactionId,
  annotation,
  targetActionAnnotation,
  eventConfiguration
}: CustomMutationParams) {
  const editedEvent = await trpcClient.event.actions.edit.request.mutate({
    declaration,
    annotation,
    eventId,
    transactionId,
    keepAssignmentIfAccepted: true
  })

  if (wasRejected(editedEvent, ActionType.EDIT)) {
    return editedEvent
  }

  const declaredEvent = await trpcClient.event.actions.declare.request.mutate({
    declaration: {},
    annotation,
    eventId,
    transactionId,
    keepAssignmentIfAccepted: true
  })

  if (
    hasPotentialDuplicates(declaredEvent, eventConfiguration) ||
    wasRejected(declaredEvent, ActionType.DECLARE)
  ) {
    return declaredEvent
  }

  return trpcClient.event.actions.register.request.mutate({
    declaration: {},
    annotation: { ...annotation, ...targetActionAnnotation },
    eventId,
    transactionId
  })
}

export async function editAndDeclare({
  eventId,
  declaration,
  transactionId,
  annotation,
  targetActionAnnotation
}: CustomMutationParams) {
  const editedEvent = await trpcClient.event.actions.edit.request.mutate({
    declaration,
    annotation,
    eventId,
    transactionId,
    keepAssignmentIfAccepted: true
  })

  if (wasRejected(editedEvent, ActionType.EDIT)) {
    return editedEvent
  }

  return trpcClient.event.actions.declare.request.mutate({
    declaration,
    annotation: { ...annotation, ...targetActionAnnotation },
    eventId,
    transactionId
  })
}

export async function editAndNotify({
  eventId,
  declaration,
  transactionId,
  annotation,
  targetActionAnnotation
}: CustomMutationParams) {
  const editedEvent = await trpcClient.event.actions.edit.request.mutate({
    declaration,
    annotation,
    eventId,
    transactionId,
    keepAssignmentIfAccepted: true
  })

  if (wasRejected(editedEvent, ActionType.EDIT)) {
    return editedEvent
  }

  return trpcClient.event.actions.notify.request.mutate({
    declaration,
    annotation: { ...annotation, ...targetActionAnnotation },
    eventId,
    transactionId
  })
}

/**
 * Runs markAsDuplicate and then archive on sequence.
 */
export async function archiveOnDuplicate({
  eventId,
  transactionId,
  declaration,
  content
}: ArchiveOnDuplicateParams) {
  await trpcClient.event.actions.duplicate.markAsDuplicate.mutate({
    eventId,
    transactionId,
    declaration,
    keepAssignmentIfAccepted: true,
    ...(content.duplicateOf
      ? { content: { duplicateOf: content.duplicateOf } }
      : {})
  })
  return trpcClient.event.actions.archive.request.mutate({
    eventId,
    transactionId,
    declaration,
    content: { reason: content.reason }
  })
}

/**
 * Runs a full correction sequence:
 * 1. Request a correction
 * 2. Approve the correction
 *
 * This is used to make a direct correction (instead of a separate request and approval) by users who are allowed to do so.
 *
 * Defining the function here, statically allows offline support.
 * Moving the function to one level up will break offline support since the definition needs to be static.
 */
export async function makeCorrectionOnRequest({
  eventId,
  declaration,
  annotation: declarationMixedUpAnnotation,
  transactionId,
  event,
  eventConfiguration,
  context
}: CorrectionRequestParams) {
  // Let's find the REQUEST_CORRECTION action configuration. Because the annotation passed down here is mixed up
  // with declaration in the REQUEST_CORRECTION page form, we need to cleanup the annotation from declaration
  const actionConfiguration = eventConfiguration.actions.find(
    (action) => action.type === ActionType.REQUEST_CORRECTION
  )

  const originalDeclaration = getCurrentEventState(
    event,
    eventConfiguration
  ).declaration

  const annotation =
    actionConfiguration && declarationMixedUpAnnotation
      ? omitHiddenAnnotationFields(
          actionConfiguration,
          originalDeclaration,
          declarationMixedUpAnnotation,
          context
        )
      : {}

  const requestCorrection = () =>
    trpcClient.event.actions.correction.request.request.mutate({
      eventId,
      declaration,
      transactionId,
      annotation,
      keepAssignmentIfAccepted: true
    })

  const response = await requestCorrection()

  if (wasRejected(response, ActionType.REQUEST_CORRECTION)) {
    return response
  }

  /**
   * Niger : trouvé le 2026-08-11 — APPROVE_CORRECTION exige côté serveur
   * que REQUEST_CORRECTION ait déjà atteint le statut "Accepted" (le
   * drapeau inhérent `correction-requested`, condition d'APPROVE_CORRECTION,
   * n'est posé qu'à ce moment-là — voir `getAvailableActionsForEvent`/
   * `INHERENT_FLAG_RULES` dans `@opencrvs/commons`). Dans cet
   * environnement, la confirmation immédiate de REQUEST_CORRECTION
   * n'aboutit jamais dans le même aller-retour. Une version précédente de
   * ce code réessayait `requestCorrection()` en boucle en espérant que le
   * statut finisse par passer à "Accepted" — mais CHAQUE nouvel appel
   * repasse par la même vérification serveur qui rejette (409) toute
   * nouvelle tentative tant que la demande précédente n'est pas résolue,
   * ce qui provoquait un rejet silencieux (aucune erreur visible) sans
   * jamais réessayer utilement. On ne réessaie donc plus : si la demande
   * n'est pas immédiatement acceptée, on la laisse simplement dans son état
   * "Requested" normal — elle attend alors une approbation manuelle depuis
   * "Corrections en attente", exactement comme pour un utilisateur qui n'a
   * pas le droit d'auto-approuver.
   */
  const requestId = response.actions.find(
    (a) =>
      a.transactionId === transactionId && a.status === ActionStatus.Accepted
  )?.id

  if (!requestId) {
    return response
  }

  return trpcClient.event.actions.correction.approve.request.mutate({
    type: ActionType.APPROVE_CORRECTION,
    transactionId: getUUID(),
    eventId,
    requestId,
    content: { immediateCorrection: true },
    waitFor: true
  })
}
