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

import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useTypedParams,
  useTypedSearchParams
} from 'react-router-typesafe-routes/dom'
import { ActionType, getDeclaration } from '@opencrvs/commons/client'
import { Alert } from '@opencrvs/components/lib/Alert'
import { useEventConfiguration } from '@client/v2-events/features/events/useEventConfiguration'
import { useEventFormData } from '@client/v2-events/features/events/useEventFormData'
import { useActionAnnotation } from '@client/v2-events/features/events/useActionAnnotation'
import { useEvents } from '@client/v2-events/features/events/useEvents/useEvents'
import { useModal } from '@client/v2-events/hooks/useModal'
import { ROUTES } from '@client/v2-events/routes'
import { Review as ReviewComponent } from '@client/v2-events/features/events/components/Review'
import { FormLayout } from '@client/v2-events/layouts'
import { makeFormFieldIdFormikCompatible } from '@client/v2-events/components/forms/utils'
import { withSuspense } from '@client/v2-events/components/withSuspense'
import { useIntlFormatMessageWithFlattenedParams } from '@client/v2-events/messages/utils'
import { useValidatorContext } from '@client/v2-events/hooks/useValidatorContext'
import { useLegalAgeSettings } from '@client/v2-events/features/legalAgeSettings/useLegalAgeSettings'
import {
  computeMarriageAgeWarnings,
  computeParentChildAgeWarnings
} from '@client/v2-events/features/legalAgeSettings/computeAgeWarnings'
import { useSoucheCertificateTemplate } from '@client/v2-events/features/events/useSoucheCertificateTemplate'
import { DeclareActionMenu } from './DeclareActionMenu'
import { DeclareSouchePreview } from './DeclareSouchePreview'

/**
 * Niger : avertissements (non bloquants, voir décret transmis par
 * l'utilisateur) sur les seuils d'âge légaux — affichés en haut de la page
 * de révision, une fois toutes les dates concernées connues. L'agent peut
 * tout de même soumettre la déclaration ; ce n'est qu'un signal.
 */
function useAgeWarnings(
  eventType: string,
  formValues: Record<string, unknown>
) {
  const { data: settings } = useLegalAgeSettings()
  if (!settings) {
    return []
  }

  if (eventType === 'birth') {
    return computeParentChildAgeWarnings(
      formValues['child.dob'] as string | undefined,
      [
        { label: 'père', dob: formValues['father.dob'] as string | undefined },
        { label: 'mère', dob: formValues['mother.dob'] as string | undefined }
      ],
      settings
    )
  }

  if (eventType === 'marriage') {
    return computeMarriageAgeWarnings(
      formValues['marriageDetails.date'] as string | undefined,
      [
        { label: 'mari', dob: formValues['husband.dob'] as string | undefined },
        { label: 'femme', dob: formValues['wife.dob'] as string | undefined }
      ],
      settings
    )
  }

  return []
}

export function Review() {
  const { eventId } = useTypedParams(ROUTES.V2.EVENTS.DECLARE.REVIEW)
  const [{ backTo }] = useTypedSearchParams(ROUTES.V2.EVENTS.DECLARE.REVIEW)
  const events = useEvents()
  const navigate = useNavigate()
  const [modal, openModal] = useModal()
  const { formatMessage } = useIntlFormatMessageWithFlattenedParams()
  const event = events.getEvent.getFromCache(eventId)
  const validatorContext = useValidatorContext(event)
  const { eventConfiguration: config } = useEventConfiguration(event.type)
  const formConfig = getDeclaration(config)
  const actionConfiguration = config.actions.find(
    (a) => a.type === ActionType.DECLARE
  )
  if (!actionConfiguration) {
    throw new Error('Action configuration not found')
  }

  const reviewConfig = actionConfiguration.review
  const form = useEventFormData((state) => state.getFormValues())
  const ageWarnings = useAgeWarnings(event.type, form)

  const { setAnnotation, getAnnotation } = useActionAnnotation()
  const annotation = getAnnotation()

  // Niger : aperçu Souche/Volet 1 à la révision de saisie (façon INCI),
  // avant même de déclarer — voir DeclareSouchePreview.tsx. Repli sur
  // l'accordéon classique si aucun gabarit ne correspond au type d'acte.
  const soucheTemplate = useSoucheCertificateTemplate(event.type, form, event)

  async function handleEdit({
    pageId,
    fieldId,
    confirmation
  }: {
    pageId: string
    fieldId?: string
    confirmation?: boolean
  }) {
    const confirmedEdit =
      confirmation ||
      (await openModal<boolean | null>((close) => (
        <ReviewComponent.EditModal close={close}></ReviewComponent.EditModal>
      )))

    if (confirmedEdit) {
      navigate(
        ROUTES.V2.EVENTS.DECLARE.PAGES.buildPath(
          { pageId, eventId },
          {
            from: 'review',
            backTo
          },
          fieldId ? makeFormFieldIdFormikCompatible(fieldId) : undefined
        )
      )
    }

    return
  }

  return (
    <FormLayout
      actionComponent={<DeclareActionMenu event={event} />}
      route={ROUTES.V2.EVENTS.DECLARE}
    >
      {ageWarnings.length > 0 && (
        <Alert type="warning">
          {ageWarnings.map((warning) => (
            <div key={warning.message}>{warning.message}</div>
          ))}
        </Alert>
      )}
      {soucheTemplate ? (
        <DeclareSouchePreview
          certificateConfig={soucheTemplate}
          event={event}
          eventConfiguration={config}
          form={form}
        />
      ) : (
        <ReviewComponent.Body
          annotation={annotation}
          form={form}
          formConfig={formConfig}
          reviewFields={reviewConfig.fields}
          title={formatMessage(reviewConfig.title, form)}
          validatorContext={validatorContext}
          onAnnotationChange={(values) => setAnnotation(values)}
          onEdit={handleEdit}
        />
      )}
      {modal}
    </FormLayout>
  )
}

export const ReviewIndex = withSuspense(Review)
