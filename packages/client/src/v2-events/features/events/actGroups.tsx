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
import { defineMessages, IntlShape } from 'react-intl'
import { canUserCreateEvent } from '@opencrvs/commons/client'
import { getScope } from '@client/profile/profileSelectors'
import { useEventConfigurations } from './useEventConfiguration'

/**
 * Niger : regroupement des types d'événement par acte d'état civil, avec un
 * sous-menu de "modèles" (transcription de déclaration / transcription de
 * jugement déclaratif / copie conforme d'extrait). Chaque "modèle" reste un
 * type d'événement (`EventConfig`) à part entière côté country-config — ce
 * regroupement n'est qu'une présentation, il n'invente pas de nouveau
 * concept côté données. Voir CONTEXTE-PROJET.md §14.
 *
 * Partagé entre l'écran de sélection (`EventSelection.tsx`) et les cartes de
 * création affichées directement sur les pages de messagerie
 * (`layouts/workqueues/CreateEventCards.tsx`).
 */
export const ACT_GROUPS: Array<{
  id: string
  icon: 'Birth' | 'WeddingRings' | 'Tombstone' | 'Scales' | 'File'
  label: { id: string; defaultMessage: string; description: string }
  eventIds: string[]
}> = [
  {
    id: 'birth-group',
    icon: 'Birth',
    label: {
      id: 'register.selectVitalEvent.group.birth',
      defaultMessage: 'Naissance',
      description: "Groupe d'actes : naissance"
    },
    eventIds: [
      'birth',
      'birth-judgment',
      'birth-certified-copy',
      'birth-certified-copy-before-1985'
    ]
  },
  {
    id: 'marriage-group',
    icon: 'WeddingRings',
    label: {
      id: 'register.selectVitalEvent.group.marriage',
      defaultMessage: 'Mariage',
      description: "Groupe d'actes : mariage"
    },
    eventIds: [
      'marriage',
      'marriage-judgment',
      'marriage-certified-copy',
      'marriage-certified-copy-before-1985'
    ]
  },
  {
    id: 'death-group',
    icon: 'Tombstone',
    label: {
      id: 'register.selectVitalEvent.group.death',
      defaultMessage: 'Décès',
      description: "Groupe d'actes : décès"
    },
    eventIds: [
      'death',
      'death-judgment',
      'death-certified-copy',
      'death-certified-copy-before-1985'
    ]
  },
  {
    id: 'divorce-group',
    icon: 'Scales',
    label: {
      id: 'register.selectVitalEvent.group.divorce',
      defaultMessage: 'Divorce / Répudiation',
      description: "Groupe d'actes : divorce et répudiation"
    },
    eventIds: ['divorce', 'divorce-judgment', 'divorce-certified-copy']
  }
]

export const OTHER_GROUP_ID = 'other-group'

export type ActGroup = (typeof ACT_GROUPS)[number]

/**
 * Groupes visibles pour l'utilisateur courant (filtrés par ses droits), avec
 * un groupe générique "Autre" ajouté à la fin si des types d'événement non
 * groupés existent (ex: le type de démo `tennis-club-membership`) — pour ne
 * jamais rendre un type d'événement inaccessible.
 */
export function useVisibleActGroups() {
  const eventConfigurations = useEventConfigurations()
  const scopes = useSelector(getScope) ?? []

  const allowedEventConfigurations = eventConfigurations.filter(({ id }) =>
    canUserCreateEvent(scopes, id)
  )

  const groupedEventIds = new Set(ACT_GROUPS.flatMap((group) => group.eventIds))
  const otherEventConfigurations = allowedEventConfigurations.filter(
    ({ id }) => !groupedEventIds.has(id)
  )

  const visibleGroups: ActGroup[] = ACT_GROUPS.filter((group) =>
    allowedEventConfigurations.some(({ id }) => group.eventIds.includes(id))
  )

  if (otherEventConfigurations.length > 0) {
    visibleGroups.push({
      id: OTHER_GROUP_ID,
      icon: 'File',
      label: {
        id: 'register.selectVitalEvent.group.other',
        defaultMessage: 'Autre',
        description: "Groupe d'actes : autres types d'événement"
      },
      eventIds: otherEventConfigurations.map(({ id }) => id)
    })
  }

  return { visibleGroups, allowedEventConfigurations }
}

export const modelMessages = defineMessages({
  declaration: {
    id: 'v2.eventSelection.model.declaration',
    defaultMessage: 'Transcription de la déclaration de {actType}',
    description: 'Nom du modèle "transcription de déclaration", par acte'
  },
  judgment: {
    id: 'v2.eventSelection.model.judgment',
    defaultMessage: 'Transcription de jugement déclaratif de {actType}',
    description: 'Nom du modèle "jugement déclaratif", par acte'
  },
  certifiedCopy: {
    id: 'v2.eventSelection.model.certifiedCopy',
    defaultMessage: "Copie conforme d'extrait d'acte de {actType}",
    description: 'Nom du modèle "copie conforme", par acte'
  },
  certifiedCopyBefore1985: {
    id: 'v2.eventSelection.model.certifiedCopyBefore1985',
    defaultMessage: "Copie conforme d'extrait d'acte de {actType} (avant 1985)",
    description: 'Nom du modèle "copie conforme avant 1985", par acte'
  }
})

const BASE_ACT_EVENT_IDS = ['birth', 'death', 'marriage', 'divorce'] as const

export const actTypeMessages = defineMessages({
  birth: {
    id: 'v2.eventSelection.model.actType.birth',
    defaultMessage: 'naissance',
    description: "Nom de l'acte inséré dans le nom du modèle : naissance"
  },
  death: {
    id: 'v2.eventSelection.model.actType.death',
    defaultMessage: 'décès',
    description: "Nom de l'acte inséré dans le nom du modèle : décès"
  },
  marriage: {
    id: 'v2.eventSelection.model.actType.marriage',
    defaultMessage: 'mariage',
    description: "Nom de l'acte inséré dans le nom du modèle : mariage"
  },
  divorce: {
    id: 'v2.eventSelection.model.actType.divorce',
    defaultMessage: 'divorce/répudiation',
    description:
      "Nom de l'acte inséré dans le nom du modèle : divorce/répudiation"
  }
})

/**
 * Retrouve l'acte de base (naissance/décès/mariage/divorce) à partir de
 * l'id d'événement, quel que soit le modèle (préfixe commun à
 * `birth`/`birth-judgment`/`birth-certified-copy`/…).
 */
export function getBaseActId(
  eventId: string
): (typeof BASE_ACT_EVENT_IDS)[number] | undefined {
  return BASE_ACT_EVENT_IDS.find(
    (base) => eventId === base || eventId.startsWith(`${base}-`)
  )
}

export type EventModelKind =
  | 'declaration'
  | 'judgment'
  | 'certified-copy'
  | 'certified-copy-before-1985'

/**
 * Dérive le "modèle" (déclaration/jugement/copie conforme/copie conforme
 * avant 1985) d'un id d'événement à partir de la convention de suffixe déjà
 * en place (`-judgment`/`-certified-copy`/`-certified-copy-before-1985`,
 * sinon déclaration) — réutilisé par `getModelLabel` ci-dessous et par le
 * filtre "Modèle" de la Recherche Avancée (voir
 * `Search/AdvancedSearch.utils.ts`). Le suffixe le plus spécifique doit être
 * vérifié en premier (`-certified-copy-before-1985` avant
 * `-certified-copy`).
 */
export function getEventModelKind(eventId: string): EventModelKind {
  if (eventId.endsWith('-judgment')) {
    return 'judgment'
  }
  if (eventId.endsWith('-certified-copy-before-1985')) {
    return 'certified-copy-before-1985'
  }
  if (eventId.endsWith('-certified-copy')) {
    return 'certified-copy'
  }
  return 'declaration'
}

/**
 * Les 3 "modèles" (transcription de déclaration / jugement déclaratif /
 * copie conforme) précisent toujours l'acte concerné (naissance / décès /
 * mariage / divorce-répudiation) dans leur libellé, même si l'acte a déjà
 * été choisi via la grille d'icônes / carte de création — voir demande du
 * 2026-09-10.
 */
export function getModelLabel(
  intl: IntlShape,
  event: { id: string; label: Parameters<IntlShape['formatMessage']>[0] }
) {
  const kind = getEventModelKind(event.id)
  const baseActId = getBaseActId(event.id)
  const actType = baseActId
    ? intl.formatMessage(actTypeMessages[baseActId])
    : ''

  if (kind === 'judgment') {
    return intl.formatMessage(modelMessages.judgment, { actType })
  }
  if (kind === 'certified-copy-before-1985') {
    return intl.formatMessage(modelMessages.certifiedCopyBefore1985, {
      actType
    })
  }
  if (kind === 'certified-copy') {
    return intl.formatMessage(modelMessages.certifiedCopy, { actType })
  }
  if (kind === 'declaration' && baseActId) {
    return intl.formatMessage(modelMessages.declaration, { actType })
  }
  return intl.formatMessage(event.label)
}
