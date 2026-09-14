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
import { defineMessages } from 'react-intl'

/**
 * Niger : "Actes à valider"/"Actes à imprimer" et leurs pendants "Copies
 * conformes à valider"/"à imprimer" pointent chacun vers une VRAIE file
 * d'attente distincte côté country-config (`pending-registration`/
 * `pending-registration-certified-copy`, `pending-certification`/
 * `pending-certification-certified-copy` — voir
 * `opencrvs-countryconfig/src/api/workqueue/workqueueConfig.ts`), plus besoin
 * de reconstruire un filtre par type d'événement côté client ici (l'ancien
 * `eventTypeFilter` scindait artificiellement UNE file mélangée ; désormais
 * chaque tuile référence directement la file déjà scindée à la source).
 */
export interface DashboardTileConfig {
  id: string
  slug: string
  label: {
    id: string
    defaultMessage: string
    description: string
  }
}

const messages = defineMessages({
  pendingValidation: {
    id: 'v2.home.dashboard.pendingValidation',
    defaultMessage: 'Actes à vérifier',
    description:
      'Libellé du tableau de bord "Aujourd\'hui" : actes en attente de vérification'
  },
  pendingRegistration: {
    id: 'v2.home.dashboard.pendingRegistration',
    defaultMessage: 'Actes à valider',
    description:
      'Libellé du tableau de bord "Aujourd\'hui" : actes en attente de validation'
  },
  pendingRegistrationCertifiedCopy: {
    id: 'v2.home.dashboard.pendingRegistrationCertifiedCopy',
    defaultMessage: 'Copies conformes à valider',
    description:
      'Libellé du tableau de bord "Aujourd\'hui" : copies conformes en attente de validation'
  },
  pendingUpdates: {
    id: 'v2.home.dashboard.pendingUpdates',
    defaultMessage: 'Actes à corriger',
    description:
      'Libellé du tableau de bord "Aujourd\'hui" : actes rejetés à corriger'
  },
  pendingCertification: {
    id: 'v2.home.dashboard.pendingCertification',
    defaultMessage: 'Actes à imprimer',
    description:
      'Libellé du tableau de bord "Aujourd\'hui" : actes en attente d\'impression'
  },
  pendingCertificationCertifiedCopy: {
    id: 'v2.home.dashboard.pendingCertificationCertifiedCopy',
    defaultMessage: 'Copies conformes à imprimer',
    description:
      'Libellé du tableau de bord "Aujourd\'hui" : copies conformes en attente d\'impression'
  },
  printed: {
    id: 'v2.home.dashboard.printed',
    defaultMessage: 'Actes imprimés',
    description:
      'Libellé du tableau de bord "Aujourd\'hui" : actes déjà imprimés au moins une fois'
  },
  correctionRequested: {
    id: 'v2.home.dashboard.correctionRequested',
    defaultMessage: 'Corrections en attente',
    description:
      'Libellé du tableau de bord "Aujourd\'hui" : actes avec une correction demandée mais pas encore approuvée'
  }
})

/**
 * Niger : les 6 tuiles du tableau de bord "Aujourd'hui", inspiré d'INCI.
 * Deux lignes d'INCI ("Villes à valider", "Calendrier des mariages") n'ont
 * aucun équivalent OpenCRVS et ont été volontairement retirées. Une tuile
 * n'est affichée que si son `slug` fait partie
 * des files auxquelles le rôle de l'utilisateur connecté a accès (voir
 * useHomeDashboardCounts.ts).
 */
export const DASHBOARD_TILES: DashboardTileConfig[] = [
  {
    id: 'pending-validation',
    slug: 'pending-validation',
    label: messages.pendingValidation
  },
  {
    id: 'pending-registration',
    slug: 'pending-registration',
    label: messages.pendingRegistration
  },
  {
    id: 'pending-registration-certified-copy',
    slug: 'pending-registration-certified-copy',
    label: messages.pendingRegistrationCertifiedCopy
  },
  {
    id: 'pending-updates',
    slug: 'pending-updates',
    label: messages.pendingUpdates
  },
  {
    id: 'pending-certification',
    slug: 'pending-certification',
    label: messages.pendingCertification
  },
  {
    id: 'printed',
    slug: 'printed',
    label: messages.printed
  },
  {
    id: 'pending-certification-certified-copy',
    slug: 'pending-certification-certified-copy',
    label: messages.pendingCertificationCertifiedCopy
  },
  {
    id: 'correction-requested',
    slug: 'correction-requested',
    label: messages.correctionRequested
  }
]
