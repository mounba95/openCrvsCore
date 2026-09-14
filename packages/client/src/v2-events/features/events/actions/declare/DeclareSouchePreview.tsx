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
import { useSelector } from 'react-redux'
import {
  CertificateTemplateConfig,
  EventConfig,
  EventDocument,
  EventState,
  getAcceptedActions,
  getCurrentEventState
} from '@opencrvs/commons/client'
import {
  addFontsToSvg,
  compileSvg
} from '@client/v2-events/features/events/actions/print-certificate/pdfUtils'
import { getOfflineData } from '@client/offline/selectors'
import { useAppConfig } from '@client/v2-events/hooks/useAppConfig'
import { useUsers } from '@client/v2-events/hooks/useUsers'
import { useLocations } from '@client/v2-events/hooks/useLocations'
import { useAdministrativeAreas } from '@client/v2-events/hooks/useAdministrativeAreas'
import { useCurrentUser } from '@client/v2-events/hooks/useCurrentUser'
import { getUserIdsFromActions } from '@client/v2-events/utils'
import { SoucheSvgViewer } from '@client/v2-events/features/events/components/SoucheDocumentPreview'

/**
 * Niger : aperçu Souche/Volet 1 pour la page de révision de saisie, avant
 * même que l'action DECLARE existe. Contrairement à `SoucheDocumentPreview`
 * (onglet "Dossier", qui lit les données déjà persistées de l'acte), on
 * compile ici le même gabarit avec les valeurs SAISIES mais pas encore
 * enregistrées (`form`, l'état éphémère du formulaire) — d'où l'absence
 * naturelle du numéro d'acte et de l'officier d'état civil, qui n'existent
 * qu'après enregistrement (les champs `$lookup` correspondants renvoient
 * simplement une valeur vide).
 */
export function DeclareSouchePreview({
  event,
  eventConfiguration,
  certificateConfig,
  form
}: {
  event: EventDocument
  eventConfiguration: EventConfig
  certificateConfig: CertificateTemplateConfig
  form: EventState
}) {
  const actions = getAcceptedActions(event)
  const userIds = getUserIdsFromActions(actions)
  const { getUsers } = useUsers()
  const [users] = getUsers.useSuspenseQuery(userIds)

  const { getLocations } = useLocations()
  const { getAdministrativeAreas } = useAdministrativeAreas()
  const locations = getLocations.useSuspenseQuery()
  const administrativeAreas = getAdministrativeAreas.useSuspenseQuery()

  const { language } = useAppConfig()
  const { config: appConfig } = useSelector(getOfflineData)
  const { currentUser } = useCurrentUser()

  if (!language || !certificateConfig.svg) {
    return <SoucheSvgViewer svgCode={null} />
  }

  const { declaration: _persistedDeclaration, ...metadata } =
    getCurrentEventState(event, eventConfiguration)

  // Niger : avant l'enregistrement, la ligne "Fait à ... le ..." (et la
  // région/le département en haut de page) lisent
  // `legalStatuses.REGISTERED.createdAtLocation`/`.createdAt`, qui n'ont
  // encore aucune valeur puisque l'acte n'est pas enregistré. On les
  // renseigne tout de même pour cet aperçu de saisie avec ce qu'on connaît
  // déjà : la commune active de l'agent (là où l'acte est saisi) et la date
  // du jour (date de saisie) — jamais persisté, purement pour l'affichage.
  //
  // Important : `createdAtLocation` doit être l'ID brut du bureau (comme une
  // vraie valeur persistée), PAS un objet {name, province, ...} déjà
  // résolu — `stringifyEventMetadata` (pdfUtils.ts) appelle lui-même
  // `LocationSearch.toCertificateVariables` sur cette valeur pour la
  // résoudre ; passer un objet à la place fait échouer silencieusement
  // cette résolution (Région/Centre principal restaient vides).
  const metadataWithDraftFacts = metadata.legalStatuses?.REGISTERED
    ? metadata
    : {
        ...metadata,
        legalStatuses: {
          ...metadata.legalStatuses,
          REGISTERED: {
            createdAtLocation: currentUser.primaryOfficeId,
            createdAt: new Date().toISOString()
          }
        }
      }

  const svgWithoutFonts = compileSvg({
    templateString: certificateConfig.svg,
    $metadata: {
      ...metadataWithDraftFacts,
      modifiedAt: new Date().toISOString(),
      copiesPrintedForTemplate: 0
    } as typeof metadata & {
      modifiedAt: string
      copiesPrintedForTemplate: number
    },
    $declaration: form,
    $actions: actions,
    review: true,
    locations,
    administrativeAreas,
    users,
    language,
    config: eventConfiguration,
    adminLevels: appConfig.ADMIN_STRUCTURE
  })

  const svgCode = addFontsToSvg(svgWithoutFonts, certificateConfig.fonts ?? {})

  return <SoucheSvgViewer svgCode={svgCode} />
}
