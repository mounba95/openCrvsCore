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
import React, { useCallback, useRef } from 'react'
import { useIntl } from 'react-intl'
import { useNavigate } from 'react-router-dom'
import { useTypedSearchParams } from 'react-router-typesafe-routes/dom'
import { v4 as uuid } from 'uuid'
import { TRPCClientError } from '@trpc/client'
import {
  ActionType,
  getDeclaration,
  EventDocument,
  getCurrentEventState,
  getActionFormFields,
  getActionReview,
  getAvailableActionsForEvent,
  getActionConfig,
  isPotentialDuplicate
} from '@opencrvs/commons/client'
import { Button } from '@opencrvs/components'
import { DropdownMenu } from '@opencrvs/components/lib/Dropdown'
import { CaretDown } from '@opencrvs/components/lib/Icon/all-icons'
import { Icon } from '@opencrvs/components'
import { useModal } from '@client/v2-events/hooks/useModal'
import { useEvents } from '@client/v2-events/features/events/useEvents/useEvents'
import { useDrafts } from '@client/v2-events/features/drafts/useDrafts'
import { messages } from '@client/i18n/messages/views/action'
import { ROUTES } from '@client/v2-events/routes'
import { trpcClient } from '@client/v2-events/trpc'
import { useEventFormNavigation } from '@client/v2-events/features/events/useEventFormNavigation'
import { messages as formHeaderMessages } from '@client/v2-events/layouts/form/FormHeader'
import { useUserAllowedActions } from '@client/v2-events/features/workqueues/Actions/useUserAllowedActions'
import { useEnsureAssignedToSelf } from '@client/v2-events/features/workqueues/Actions/useEnsureAssignedToSelf'
import {
  actionIcons,
  actionLabels
} from '@client/v2-events/features/workqueues/Actions/utils'
import { useValidatorContext } from '@client/v2-events/hooks/useValidatorContext'
import {
  AcceptActionModalResult,
  Review
} from '@client/v2-events/features/events/components/Review'
import { useSaveAndExitModal } from '@client/v2-events/components/SaveAndExitModal'
import { validationErrorsInActionFormExist } from '@client/v2-events/components/forms/validation'
import { useCanDirectlyRegister } from '../useCanDirectlyRegister'
import { useCanDirectlyValidate } from '../useCanDirectlyValidate'
import { useActionAnnotation } from '../../useActionAnnotation'
import { useEventFormData } from '../../useEventFormData'
import { useEventConfiguration } from '../../useEventConfiguration'

/**
 * Declaration actions contain actions available on the review page of the declare flow. This can include:
 *   - Notify (incomplete records)
 *   - Declare (non-incomplete records)
 *   - Validate (aka. 'direct validation', which means declare+validate actions)
 *   - Register (aka. 'direct registration', which means declare+validate+register actions)
 *   - Save and exit
 *   - Delete declaration
 */
function useDeclarationActions(event: EventDocument) {
  const intl = useIntl()
  const navigate = useNavigate()
  const eventType = event.type
  const drafts = useDrafts()
  const {
    closeActionView,
    deleteDeclaration,
    modal: deleteDeclarationModal
  } = useEventFormNavigation()
  const { eventConfiguration } = useEventConfiguration(eventType)
  const formConfig = getDeclaration(eventConfiguration)
  const validatorContext = useValidatorContext()
  const declaration = useEventFormData((state) => state.getFormValues())
  const { getAnnotation } = useActionAnnotation()
  const annotation = getAnnotation()
  const [modal, openModal] = useModal()
  const canDirectlyRegister = useCanDirectlyRegister(event)
  const canDirectlyValidate = useCanDirectlyValidate(event)
  const [{ backTo }] = useTypedSearchParams(ROUTES.V2.EVENTS.DECLARE.REVIEW)
  const { saveAndExitModal, handleSaveAndExit } = useSaveAndExitModal()
  const events = useEvents()
  // Niger : DECLARE désassigne automatiquement l'acte une fois accepté — si
  // un doublon potentiel est détecté, il faut réassigner avant de naviguer
  // vers la page de comparaison, sinon elle ne charge rien (même piège que
  // pour "Historique", voir useEventOverviewInfo.ts).
  const ensureAssignedToSelf = useEnsureAssignedToSelf(event.id)

  const actionConfig = getActionConfig({
    eventConfiguration,
    actionType: ActionType.DECLARE
  })

  const dialogCopy =
    actionConfig && 'dialogCopy' in actionConfig
      ? actionConfig.dialogCopy
      : null

  // Niger : action combinée déclarer+valider pour l'Agent Vérificateur (pas
  // de scope record.register) — voir useCanDirectlyValidate.
  const validateActionConfig = getActionConfig({
    eventConfiguration,
    actionType: ActionType.CUSTOM,
    customActionType: 'VALIDATE_DECLARATION'
  })

  const eventId = event.id

  const actions = {
    [ActionType.DECLARE]: {
      supportingCopy: dialogCopy?.declare,
      fields: getActionFormFields(eventConfiguration, ActionType.DECLARE),
      title: {
        id: 'review.declare.confirmModal.title',
        defaultMessage: 'Declare the {event}?',
        description: 'The title for review action modal when declaring'
      },
      onConfirmLabel: actionLabels[ActionType.DECLARE],
      // Niger, 2026-08-22 : `waitFor: false` — sans lui, le serveur attend
      // que l'indexation Elasticsearch (déclaration + éventuel doublon
      // détecté) soit terminée avant de répondre, ce qui pouvait prendre
      // plusieurs secondes avec beaucoup d'actes similaires en base. Le
      // reste du code lit `resultEvent.actions` (renvoyé directement par
      // cette requête, donc déjà à jour) plutôt qu'une relecture qui,
      // elle, dépendrait de l'indexation.
      onConfirm: (values: AcceptActionModalResult['values']) =>
        events.actions.declare.mutateAsync({
          eventId,
          declaration,
          annotation: { ...annotation, ...values },
          transactionId: uuid(),
          waitFor: false
        })
    },
    [ActionType.REGISTER]: {
      supportingCopy: dialogCopy?.register,
      // Combined declare+register shows only REGISTER's dialog fields
      fields: getActionFormFields(eventConfiguration, ActionType.REGISTER),
      title: {
        id: 'review.register.confirmModal.title',
        defaultMessage: 'Register the {event}?',
        description: 'The title for review action modal when registering'
      },
      onConfirmLabel: actionLabels[ActionType.REGISTER],
      // Combined flow: dialog values belong to the final REGISTER action only
      onConfirm: (values: AcceptActionModalResult['values']) =>
        events.customActions.registerOnDeclare.mutateAsync({
          eventId,
          declaration,
          annotation,
          targetActionAnnotation: values,
          transactionId: uuid()
        })
    },
    VALIDATE_DECLARATION: {
      supportingCopy: undefined,
      // Combined declare+validate shows only VALIDATE_DECLARATION's dialog fields
      fields: getActionFormFields(
        eventConfiguration,
        ActionType.CUSTOM,
        'VALIDATE_DECLARATION'
      ),
      title: validateActionConfig?.label ?? {
        id: 'review.validate.confirmModal.title',
        defaultMessage: 'Validate the {event}?',
        description: 'The title for review action modal when validating'
      },
      onConfirmLabel: validateActionConfig?.label ?? {
        id: 'event.birth.action.validate-declaration.label',
        defaultMessage: 'Validate',
        description: 'Label for validate button in dropdown menu'
      },
      // Combined flow: dialog values belong to the final VALIDATE_DECLARATION action only
      onConfirm: (values: AcceptActionModalResult['values']) =>
        events.customActions.declareAndValidate.mutateAsync({
          eventId,
          declaration,
          annotation,
          targetActionAnnotation: values,
          transactionId: uuid()
        })
    }
  }

  const reviewConfig = getActionReview(eventConfiguration, ActionType.DECLARE)
  if (!reviewConfig) {
    throw new Error('Review config not found')
  }

  /**
   * hasValidationErrors is true if:
   * - the form has any field validation errors or
   * - the form is incomplete
   *
   * If hasValidationErrors is true, the user is still able to Notify an event (if they have the required scope)
   */
  const hasValidationErrors = validationErrorsInActionFormExist({
    formConfig,
    form: declaration,
    annotation,
    context: validatorContext,
    reviewFields: reviewConfig.fields
  })

  const eventIndex = getCurrentEventState(event, eventConfiguration)
  const { isActionAllowed } = useUserAllowedActions(eventIndex)

  const onDelete = useCallback(async () => {
    await deleteDeclaration(eventId, backTo)
  }, [eventId, deleteDeclaration, backTo])

  // Niger : garde contre le double-envoi (double-clic, ou l'utilisateur qui
  // revient sur cette page pendant qu'une soumission précédente est encore
  // en vol) — sans ça, une deuxième tentative sur le même acte tombait sur
  // "action non disponible" une fois la mise à jour optimiste de la
  // première appliquée, ce qui donnait l'impression à tort que la
  // déclaration avait échoué/était bloquée.
  const isSubmittingRef = useRef(false)

  async function handleDeclaration(actionType: keyof typeof actions) {
    if (isSubmittingRef.current) {
      return
    }

    const action = actions[actionType]

    const modalResult = await openModal<AcceptActionModalResult | null>(
      (close) => {
        return (
          <Review.ActionModal.Accept
            action="Declare"
            close={close}
            copy={{
              supportingCopy: action.supportingCopy,
              title: action.title,
              onConfirm: action.onConfirmLabel
            }}
            declaration={declaration}
            eventConfiguration={eventConfiguration}
            eventType={intl.formatMessage(eventConfiguration.label)}
            fields={action.fields}
          />
        )
      }
    )

    if (modalResult) {
      isSubmittingRef.current = true
      try {
        // Niger : re-vérifie/reprend l'assignation juste avant d'envoyer
        // Déclarer/Valider/Enregistrer — un premier essai resté sans effet
        // visible dans l'UI (ex. une désassignation issue d'une tentative
        // précédente, ou un simple délai réseau) pouvait laisser le client
        // pensant encore assigné alors que le serveur ne l'est plus, faisant
        // échouer silencieusement `declare.mutateAsync` avec "You are not
        // assigned to this event" sans aucun retour visuel pour l'agent.
        const isAssigned = await ensureAssignedToSelf()
        if (!isAssigned) {
          closeActionView(backTo)
          return
        }
        // Niger : on attend la confirmation serveur avant de quitter la
        // page — auparavant la navigation se faisait immédiatement après un
        // simple `.mutate()` (sans attendre), ce qui pouvait laisser l'acte
        // dans un état incohérent si la requête échouait après coup.
        const resultEvent = await action.onConfirm(modalResult.values)
        // Niger : si un doublon potentiel vient d'être détecté, on
        // emmène directement sur la page de comparaison des doublons —
        // auparavant on retournait simplement à `backTo` (souvent
        // l'accueil), laissant seulement un toast, sans moyen de comparer.
        // DECLARE désassigne automatiquement l'acte une fois accepté, donc
        // on doit se réassigner avant de naviguer, sinon la page de
        // comparaison ne charge rien.
        if (isPotentialDuplicate(resultEvent.actions)) {
          const canProceed = await ensureAssignedToSelf()
          if (!canProceed) {
            closeActionView(backTo)
            return
          }
          navigate(
            ROUTES.V2.EVENTS.REVIEW_POTENTIAL_DUPLICATE.buildPath(
              { eventId },
              { backTo }
            )
          )
        } else {
          closeActionView(backTo)
        }
      } catch (err) {
        // Niger : investigation du 2026-08-22 — une requête Déclarer/Valider/
        // Enregistrer peut échouer avec 409 "You are not assigned to this
        // event" alors que l'action a en réalité déjà été acceptée par une
        // AUTRE requête concurrente pour le même acte (ex. une mutation mise
        // en file d'attente hors-ligne rejouée automatiquement) — confirmé en
        // base : l'action était bien passée en 'Accepted' malgré l'erreur
        // reçue côté client. Avant d'afficher une erreur qui donnerait à tort
        // l'impression que rien ne s'est passé, on revérifie l'état réel de
        // l'acte : si l'action demandée n'est de toute façon plus disponible
        // (déjà effectuée), on considère que c'est un succès et on continue
        // normalement au lieu d'alarmer l'utilisateur pour rien.
        if (
          err instanceof TRPCClientError &&
          err.data?.httpStatus === 409
        ) {
          const freshEvent = await trpcClient.event.get
            .query({ eventId, waitFor: false })
            .catch(() => null)
          if (freshEvent) {
            const freshIndex = getCurrentEventState(
              freshEvent,
              eventConfiguration
            )
            const stillAvailable = getAvailableActionsForEvent(
              freshIndex
            ).includes(ActionType.DECLARE)
            if (!stillAvailable) {
              closeActionView(backTo)
              return
            }
          }
        }
        throw err
      } finally {
        isSubmittingRef.current = false
      }
    }
  }

  const availableActions = getAvailableActionsForEvent(eventIndex)

  const goToForm = () =>
    navigate(
      ROUTES.V2.EVENTS.DECLARE.PAGES.buildPath(
        { pageId: formConfig.pages[0].id, eventId },
        { from: 'review', backTo }
      )
    )

  // Niger : Valider ne remplace Déclarer que pour un rôle qui a le scope de
  // l'action personnalisée VALIDATE_DECLARATION mais pas record.register
  // (l'Agent Vérificateur) — un Admin/OEC qui a les deux garde Enregistrer +
  // Déclarer comme avant, sans jamais voir Valider.
  const showValidateInsteadOfDeclare =
    isActionAllowed(ActionType.CUSTOM) && !isActionAllowed(ActionType.REGISTER)

  return {
    modals: [modal, saveAndExitModal, deleteDeclarationModal],
    actions: [
      {
        // Niger : ramène au formulaire depuis l'aperçu Souche/Volet 1 de la
        // révision (voir DeclareSouchePreview.tsx) — plus de liens
        // "Modifier" par section sur cet aperçu visuel en lecture seule.
        icon: 'PencilLine' as const,
        label: {
          id: 'v2.events.declare.review.backToForm',
          defaultMessage: 'Modifier',
          description:
            'Bouton pour revenir au formulaire depuis la prévisualisation'
        },
        onClick: async () => goToForm(),
        hidden: false
      },
      {
        icon: actionIcons[ActionType.REGISTER],
        label: actionLabels[ActionType.REGISTER],
        onClick: async () => handleDeclaration(ActionType.REGISTER),
        hidden: !isActionAllowed(ActionType.REGISTER),
        disabled: hasValidationErrors || !canDirectlyRegister
      },
      {
        // Niger : action combinée déclarer+valider pour l'Agent Vérificateur
        // — l'acte part directement dans la file de l'OEC au lieu de rester
        // dans "pending-validation" qu'il vient lui-même de créer.
        icon: 'Stamp' as const,
        label: validateActionConfig?.label ?? {
          id: 'event.birth.action.validate-declaration.label',
          defaultMessage: 'Validate',
          description: 'Label for validate button in dropdown menu'
        },
        onClick: async () => handleDeclaration('VALIDATE_DECLARATION'),
        hidden: !showValidateInsteadOfDeclare,
        disabled: hasValidationErrors || !canDirectlyValidate
      },
      {
        icon: actionIcons[ActionType.DECLARE],
        label: actionLabels[ActionType.DECLARE],
        onClick: async () => handleDeclaration(ActionType.DECLARE),
        hidden: !isActionAllowed(ActionType.DECLARE) || showValidateInsteadOfDeclare,
        disabled: hasValidationErrors
      },
      {
        icon: 'FloppyDisk' as const,
        label: formHeaderMessages.saveExitButton,
        onClick: async () =>
          handleSaveAndExit(() => {
            drafts.submitLocalDraft()
            return closeActionView(backTo)
          }),
        hidden: false
      },
      {
        icon: 'Trash' as const,
        label: formHeaderMessages.deleteDeclaration,
        onClick: async () => onDelete(),
        hidden: !availableActions.includes(ActionType.DELETE)
      }
    ].filter((a) => !a.hidden)
  }
}

/**
 * Menu component available on the declaration review page.
 * We have tried to contain all logic to which actions are available in the declaration in this component.
 * */
export function DeclareActionMenu({ event }: { event: EventDocument }) {
  const intl = useIntl()
  const { modals, actions } = useDeclarationActions(event)

  return (
    <>
      <DropdownMenu id="action">
        <DropdownMenu.Trigger asChild>
          <Button
            data-testid="action-dropdownMenu"
            size="medium"
            type="primary"
          >
            {intl.formatMessage(messages.action)} <CaretDown />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          {actions.map(({ onClick, icon, label, disabled }, index) => (
            <DropdownMenu.Item
              key={index}
              disabled={disabled}
              onClick={onClick}
            >
              <Icon color="currentColor" name={icon} size="small" />
              {intl.formatMessage(label)}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu>
      {modals}
    </>
  )
}
