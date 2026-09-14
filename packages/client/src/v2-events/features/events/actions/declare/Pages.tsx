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

import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useTypedParams,
  useTypedSearchParams
} from 'react-router-typesafe-routes/dom'
import { getDeclarationPages, isPageVisible } from '@opencrvs/commons/client'
import { Alert } from '@opencrvs/components/lib/Alert'
import { Button } from '@opencrvs/components/lib/Button'
import { Content, ContentSize } from '@opencrvs/components/lib/Content'
import { Pages as PagesComponent } from '@client/v2-events/features/events/components/Pages'

import { useEventFormData } from '@client/v2-events/features/events/useEventFormData'
import { useEventFormNavigation } from '@client/v2-events/features/events/useEventFormNavigation'
import { FormLayout } from '@client/v2-events/layouts'
import { ROUTES } from '@client/v2-events/routes'
import { useDrafts } from '@client/v2-events/features/drafts/useDrafts'
import { isTemporaryId } from '@client/v2-events/utils'
import { useSaveAndExitModal } from '@client/v2-events/components/SaveAndExitModal'
import { useEvents } from '@client/v2-events/features/events/useEvents/useEvents'
import { useEventConfiguration } from '@client/v2-events/features/events/useEventConfiguration'
import { useValidatorContext } from '@client/v2-events/hooks/useValidatorContext'
import { useCurrentUser } from '@client/v2-events/hooks/useCurrentUser'
import { useCreateEventAndNavigate } from '@client/v2-events/features/events/useCreateEventAndNavigate'
import { useDeclarationDeadlineSettings } from '@client/v2-events/features/declarationDeadlines/useDeclarationDeadlineSettings'
import {
  computeDeclarationDeadline,
  DeadlineActType
} from '@client/v2-events/features/declarationDeadlines/computeDeclarationDeadline'

/**
 * Niger : délai légal de déclaration (60j / 6 mois en commune d'urgence /
 * 90j de viduité pour le divorce) — voir décret transmis par l'utilisateur.
 *
 * Corrigé le 2026-08-09 : la comparaison se fait entre la date du FAIT
 * (`dateFieldId`) et la date à laquelle la déclaration a été FAITE
 * (`declarationDateFieldId`, saisie par l'agent — `informant.
 * declarationDate` pour naissance/décès/mariage, `divorceDetails.
 * requestDate` pour le divorce), jamais contre l'horloge système. Un acte
 * ancien ressaisi/complété aujourd'hui dans le logiciel n'est donc PAS hors
 * délai tant que sa déclaration (papier) a bien eu lieu dans les temps.
 * Le blocage n'intervient donc que sur la page où `declarationDateFieldId`
 * est saisi (pas sur la page de la date du fait) — pour naissance/décès/
 * mariage, `informant.declarationDate` est sur une page ultérieure
 * ('informant'), distincte de celle de la date du fait ('divorceDetails'
 * pour le jugement/prononcé) ; `divorceDetails.requestDate` (date de la
 * requête) a également été déplacé sur la page 'informant' le 2026-08-17
 * (absente à tort de 'divorceDetails' sur l'écran réel INCI) — même
 * schéma que les trois autres actes désormais.
 */
const DEADLINE_ACT_CONFIG: Record<
  string,
  {
    pageId: string
    dateFieldId: string
    declarationDateFieldId: string
    actType: DeadlineActType
    /**
     * Niger : uniquement pour le divorce — champ `divorceDetails.
     * dissolutionType` ('DIVORCE' | 'REPUDIATION'), qui détermine si le
     * délai de viduité de 90 jours s'applique (voir
     * computeDeclarationDeadline.ts).
     */
    dissolutionTypeFieldId?: string
  }
> = {
  birth: {
    pageId: 'informant',
    dateFieldId: 'child.dob',
    declarationDateFieldId: 'informant.declarationDate',
    actType: 'birth'
  },
  death: {
    pageId: 'informant',
    dateFieldId: 'eventDetails.date',
    declarationDateFieldId: 'informant.declarationDate',
    actType: 'death'
  },
  marriage: {
    pageId: 'informant',
    dateFieldId: 'marriageDetails.date',
    declarationDateFieldId: 'informant.declarationDate',
    actType: 'marriage'
  },
  divorce: {
    // Niger : `divorceDetails.requestDate` a été déplacé de la page
    // 'divorceDetails' vers la page 'informant' le 2026-08-17 (elle
    // n'apparaissait pas sur l'écran réel INCI de la page divorceDetails —
    // voir events/divorce/pages.ts, `informantWithRequestDate`). `pageId`
    // doit rester la page où `declarationDateFieldId` est effectivement
    // saisi, comme pour naissance/décès/mariage ci-dessus — sinon le
    // bouton "Retour" de l'écran de blocage ramène vers une page qui ne
    // contient plus le champ à corriger.
    pageId: 'informant',
    dateFieldId: 'divorceDetails.date',
    declarationDateFieldId: 'divorceDetails.requestDate',
    actType: 'divorce',
    dissolutionTypeFieldId: 'divorceDetails.dissolutionType'
  }
}

export function Pages() {
  const { eventId, pageId } = useTypedParams(ROUTES.V2.EVENTS.DECLARE.PAGES)
  const [searchParams] = useTypedSearchParams(ROUTES.V2.EVENTS.DECLARE.PAGES)
  const events = useEvents()
  const navigate = useNavigate()
  const drafts = useDrafts()
  const { modal, closeActionView } = useEventFormNavigation()
  const { saveAndExitModal, handleSaveAndExit } = useSaveAndExitModal()
  const { getFormValues, setFormValues } = useEventFormData()
  const formValues = getFormValues()
  const event = events.getEvent.getFromCache(eventId)
  const validatorContext = useValidatorContext(event)

  const { eventConfiguration: configuration } = useEventConfiguration(
    event.type
  )
  const declarationPages = getDeclarationPages(configuration)

  const currentPageId =
    declarationPages.find((p) => p.id === pageId)?.id || declarationPages[0]?.id

  if (!currentPageId) {
    throw new Error('Form does not have any pages')
  }

  const { currentUser } = useCurrentUser()
  const { data: deadlineSettings } = useDeclarationDeadlineSettings()
  const createEventAndNavigate = useCreateEventAndNavigate()

  const deadlineConfig = DEADLINE_ACT_CONFIG[event.type]

  // Niger : le blocage n'intercepte qu'à PARTIR de la page SUIVANT celle où
  // `declarationDateFieldId` est saisi — jamais cette page elle-même. Sinon,
  // dès que l'agent tape une date de déclaration tardive, l'écran de
  // blocage remplacerait la page en cours et masquerait le champ qu'il
  // vient de remplir, l'empêchant de corriger une simple erreur de saisie
  // (voir retour utilisateur du 2026-08-09). En restant visible sur cette
  // page, l'agent peut toujours corriger `declarationDateFieldId`
  // directement, et remonter avec le "Précédent" normal du formulaire
  // jusqu'à la page de la date du fait si c'est plutôt celle-ci qui est
  // erronée — aucune donnée déjà saisie n'est perdue dans les deux cas.
  const visiblePages = declarationPages.filter((page) =>
    isPageVisible(page, formValues, validatorContext)
  )
  const deadlinePageIndex = deadlineConfig
    ? visiblePages.findIndex((p) => p.id === deadlineConfig.pageId)
    : -1
  const currentVisibleIndex = visiblePages.findIndex(
    (p) => p.id === currentPageId
  )
  const isPastDeadlinePage =
    deadlinePageIndex !== -1 && currentVisibleIndex > deadlinePageIndex

  const eventDateValue = deadlineConfig
    ? formValues[deadlineConfig.dateFieldId]
    : undefined
  const declarationDateValue = deadlineConfig
    ? formValues[deadlineConfig.declarationDateFieldId]
    : undefined
  const dissolutionTypeValue = deadlineConfig?.dissolutionTypeFieldId
    ? formValues[deadlineConfig.dissolutionTypeFieldId]
    : undefined

  const deadlineResult =
    isPastDeadlinePage &&
    deadlineConfig &&
    deadlineSettings &&
    typeof eventDateValue === 'string' &&
    eventDateValue &&
    typeof declarationDateValue === 'string' &&
    declarationDateValue
      ? computeDeclarationDeadline({
          actType: deadlineConfig.actType,
          eventDate: new Date(eventDateValue),
          isRepudiation: dissolutionTypeValue === 'REPUDIATION',
          declarationDate: new Date(declarationDateValue),
          communeId: currentUser.primaryOfficeId,
          settings: deadlineSettings
        })
      : undefined

  // Niger : "Retour" sur l'écran de blocage ramène directement à la page où
  // les deux dates sont saisies (jamais juste "une page en arrière", qui
  // pourrait rester coincée sur une autre page elle aussi bloquée si
  // l'agent avait déjà avancé plus loin avant ce correctif).
  const backToDeadlinePageId = deadlineConfig?.pageId

  useEffect(() => {
    if (pageId !== currentPageId) {
      navigate(
        ROUTES.V2.EVENTS.DECLARE.PAGES.buildPath(
          {
            eventId,
            pageId: currentPageId
          },
          searchParams
        ),
        { replace: true }
      )
    }
  }, [pageId, currentPageId, navigate, eventId, searchParams])

  /*
   * If the event had a temporary ID and the record got persisted while the user
   * was on the declare page, we need to navigate to the event with the canonical
   * ID.
   */
  useEffect(() => {
    const hasTemporaryId = isTemporaryId(event.id)

    if (eventId !== event.id && !hasTemporaryId) {
      navigate(
        ROUTES.V2.EVENTS.DECLARE.PAGES.buildPath(
          {
            eventId: event.id,
            pageId: currentPageId
          },
          searchParams
        )
      )
    }
  }, [currentPageId, event.id, eventId, navigate, searchParams])

  return (
    <FormLayout
      route={ROUTES.V2.EVENTS.DECLARE}
      onSaveAndExit={async () =>
        handleSaveAndExit(() => {
          drafts.submitLocalDraft()
          closeActionView(searchParams.backTo)
        })
      }
    >
      {modal}
      {deadlineResult?.isLate ? (
        <Content size={ContentSize.NORMAL} title="Délai légal dépassé">
          <Alert type="warning">
            Le délai légal de déclaration simple pour cet acte est dépassé
            (au-delà du {deadlineResult.deadlineDate.toLocaleDateString(
              'fr-FR'
            )}). Vous devez utiliser un Jugement Supplétif pour enregistrer
            cet acte.
          </Alert>
          <Button
            size="medium"
            type="primary"
            onClick={() => createEventAndNavigate(`${event.type}-judgment`)}
          >
            Créer un Jugement Supplétif
          </Button>
          {backToDeadlinePageId && (
            <Button
              size="medium"
              type="secondary"
              onClick={() =>
                navigate(
                  ROUTES.V2.EVENTS.DECLARE.PAGES.buildPath(
                    { eventId, pageId: backToDeadlinePageId },
                    searchParams
                  )
                )
              }
            >
              Retour (corriger une date)
            </Button>
          )}
        </Content>
      ) : (
        <PagesComponent
          attachmentPath={`events/${event.id}/`}
          eventConfig={configuration}
          formData={formValues}
          formPages={declarationPages}
          pageId={currentPageId}
          setFormData={(data) => setFormValues(data)}
          validatorContext={validatorContext}
          onPageChange={(nextPageId: string) =>
            navigate(
              ROUTES.V2.EVENTS.DECLARE.PAGES.buildPath(
                {
                  eventId,
                  pageId: nextPageId
                },
                searchParams
              )
            )
          }
          onSubmit={() =>
            navigate(
              ROUTES.V2.EVENTS.DECLARE.REVIEW.buildPath(
                { eventId },
                { backTo: searchParams.backTo }
              )
            )
          }
        />
      )}
      {saveAndExitModal}
    </FormLayout>
  )
}
