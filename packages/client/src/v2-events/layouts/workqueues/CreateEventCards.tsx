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
import React, { useState } from 'react'
import styled, { css } from 'styled-components'
import { defineMessages, useIntl, IntlShape } from 'react-intl'
import { Dialog } from '@opencrvs/components/lib/Dialog'
import { Button } from '@opencrvs/components/lib/Button'
import { TextInput } from '@opencrvs/components/lib/TextInput'
import { Icon, IconProps } from '@opencrvs/components/lib/Icon'
import { EventConfig } from '@opencrvs/commons/client'
import {
  useCreateEventAndNavigate
} from '@client/v2-events/features/events/useCreateEventAndNavigate'
import { useModal } from '@client/v2-events/hooks/useModal'
import {
  ActGroup,
  getModelLabel,
  useVisibleActGroups
} from '@client/v2-events/features/events/actGroups'

/**
 * Niger : remplace le bouton "+" par une grille de cartes de création
 * toujours visible en haut des pages de messagerie — plus besoin de cliquer
 * pour découvrir qu'on peut créer une déclaration. Un clic sur une carte
 * ouvre une jolie modale pour choisir le modèle (ou, si l'acte n'a qu'un
 * seul modèle, crée directement la déclaration). Voir CONTEXTE-PROJET.md §14.
 */

const Section = styled.section<{ $embedded?: boolean }>`
  ${({ $embedded }) =>
    $embedded
      ? css`
          margin: 0;
          padding: 0;
        `
      : css`
          max-width: 1140px;
          margin: 24px auto 32px auto;
          padding: 0 24px;
        `}
`

const SectionTitle = styled.h2`
  ${({ theme }) => theme.fonts.h3};
  color: ${({ theme }) => theme.colors.grey500};
  margin: 0 0 16px 0;
  text-align: center;
`

const Grid = styled.div<{ $embedded?: boolean }>`
  display: flex;
  flex-wrap: wrap;
  justify-content: ${({ $embedded }) => ($embedded ? 'flex-start' : 'center')};
  gap: ${({ $embedded }) => ($embedded ? '24px' : '16px')};
`

const Card = styled.button<{ $embedded?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: center;
  ${({ theme }) => theme.fonts.bold14};
  color: ${({ theme }) => theme.colors.grey600};
  transition: transform 0.12s ease-out;

  ${({ $embedded }) =>
    $embedded
      ? css`
          width: 108px;
        `
      : css`
          width: 168px;
          padding: 28px 12px;
          border-radius: 12px;
          background: ${({ theme }) => theme.colors.white};
          box-shadow: 0 1px 4px rgba(16, 44, 25, 0.08);
          ${({ theme }) => theme.fonts.bold16};

          &:hover,
          &:focus-visible {
            box-shadow: 0 6px 16px rgba(16, 44, 25, 0.16);
            background: ${({ theme }) => theme.colors.brandGreenLight};
          }
        `}

  &:hover,
  &:focus-visible {
    transform: translateY(-3px);
  }
`

const IconCircle = styled.div<{ size?: number; $embedded?: boolean }>`
  width: ${({ size }) => size ?? 60}px;
  height: ${({ size }) => size ?? 60}px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: ${({ theme, $embedded }) =>
    $embedded ? theme.colors.brandGreen : theme.colors.brandGreenLight};
`

// Niger : filtre + liste "dossier + lignes" calqués sur la modale de
// sélection de modèle d'INCI (capture fournie le 2026-08-18) — remplace les
// anciennes cartes blanches à grosses icônes rondes.
const Instruction = styled.p`
  ${({ theme }) => theme.fonts.reg16};
  margin: 0 0 12px 0;
`

const FolderHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  ${({ theme }) => theme.fonts.bold16};
  color: #33795c;
  margin-bottom: 4px;
`

// Niger : pas de carte blanche autour de la liste — chez INCI, le filtre,
// le dossier et les lignes reposent tous sur la même surface verte pâle que
// le reste de la modale (signalé par l'utilisateur le 2026-08-18, capture
// à l'appui : notre premier essai isolait la liste dans une carte blanche).
const ModelList = styled.div`
  display: flex;
  flex-direction: column;
  margin-bottom: 16px;
`

const ModelRow = styled.button<{ $selected?: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: none;
  border-radius: 4px;
  background: ${({ $selected }) => ($selected ? '#ffffff' : 'transparent')};
  cursor: pointer;
  text-align: left;
  ${({ theme }) => theme.fonts.reg16};
  color: #33795c;

  &:hover,
  &:focus-visible {
    background: #ffffff;
  }
`

const messages = defineMessages({
  title: {
    id: 'v2.workqueue.createEvent.title',
    defaultMessage: 'Créer une nouvelle déclaration',
    description:
      'Titre de la section de création rapide en haut des pages de messagerie'
  },
  chooseModelTitle: {
    id: 'v2.workqueue.createEvent.chooseModel.title',
    defaultMessage: "Sélection d'un modèle",
    description: 'Titre de la modale de choix du modèle'
  },
  chooseModelInstruction: {
    id: 'v2.workqueue.createEvent.chooseModel.instruction',
    defaultMessage: "Veuillez sélectionner un modèle",
    description: 'Instruction de la modale de choix du modèle'
  },
  filterPlaceholder: {
    id: 'v2.workqueue.createEvent.chooseModel.filter',
    defaultMessage: 'Filtrer',
    description: 'Champ de filtre de la modale de choix du modèle'
  },
  ok: {
    id: 'v2.workqueue.createEvent.chooseModel.ok',
    defaultMessage: 'OK',
    description: 'Bouton de confirmation de la modale de choix du modèle'
  },
  cancel: {
    id: 'v2.workqueue.createEvent.chooseModel.cancel',
    defaultMessage: 'Annuler',
    description: "Bouton d'annulation de la modale de choix du modèle"
  }
})

function getModelIcon(eventId: string): IconProps['name'] {
  if (eventId.endsWith('-judgment')) {
    return 'Buildings'
  }
  if (eventId.endsWith('-certified-copy')) {
    return 'Copy'
  }
  return 'FileText'
}

function ModelPickerDialog({
  intl,
  group,
  models,
  onSelect,
  onClose
}: {
  intl: IntlShape
  group: ActGroup
  models: EventConfig[]
  onSelect: (eventId: string) => void
  onClose: () => void
}) {
  const [filter, setFilter] = useState('')
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)

  const filteredModels = models.filter((event) =>
    getModelLabel(intl, event).toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <Dialog
      actions={[
        <Button
          key="ok"
          disabled={!selectedEventId}
          id="model-picker-ok"
          size="medium"
          type="primary"
          onClick={() => selectedEventId && onSelect(selectedEventId)}
        >
          {intl.formatMessage(messages.ok)}
        </Button>,
        <Button
          key="cancel"
          id="model-picker-cancel"
          size="medium"
          type="secondary"
          onClick={onClose}
        >
          {intl.formatMessage(messages.cancel)}
        </Button>
      ]}
      headerVariant="green"
      isOpen
      title={intl.formatMessage(messages.chooseModelTitle)}
      variant="large"
      width={700}
      onClose={onClose}
    >
      <Instruction>
        {intl.formatMessage(messages.chooseModelInstruction)}
      </Instruction>
      <TextInput
        id="model-picker-filter"
        placeholder={intl.formatMessage(messages.filterPlaceholder)}
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <FolderHeader>
        <Icon color="currentColor" name="Folder" size="small" />
        {intl.formatMessage(group.label)} ({filteredModels.length})
      </FolderHeader>
      <ModelList>
        {filteredModels.map((event) => (
          <ModelRow
            key={event.id}
            $selected={selectedEventId === event.id}
            type="button"
            onClick={() => setSelectedEventId(event.id)}
            onDoubleClick={() => onSelect(event.id)}
          >
            <Icon
              color="currentColor"
              name={getModelIcon(event.id)}
              size="small"
            />
            {getModelLabel(intl, event)}
          </ModelRow>
        ))}
      </ModelList>
    </Dialog>
  )
}

export function CreateEventCards({
  embedded = false
}: {
  // Niger : utilisé sur la page d'accueil pour insérer la grille dans le
  // panneau "Création" (voir Home.tsx/PanelCard.tsx) sans son propre titre
  // ni sa mise en page pleine-largeur habituelle. Les autres usages (haut
  // des pages de messagerie) ne passent pas cette prop.
  embedded?: boolean
}) {
  const intl = useIntl()
  const { visibleGroups, allowedEventConfigurations } = useVisibleActGroups()
  const createEventAndNavigate = useCreateEventAndNavigate()
  const [modal, openModal] = useModal()

  if (visibleGroups.length === 0) {
    return null
  }

  async function handleGroupClick(group: ActGroup) {
    if (group.eventIds.length === 1) {
      createEventAndNavigate(group.eventIds[0])
      return
    }

    const models = group.eventIds
      .map((id) => allowedEventConfigurations.find((event) => event.id === id))
      .filter((event): event is EventConfig => Boolean(event))

    const selectedEventId = await openModal<string | null>((close) => (
      <ModelPickerDialog
        group={group}
        intl={intl}
        models={models}
        onClose={() => close(null)}
        onSelect={(eventId) => close(eventId)}
      />
    ))

    if (selectedEventId) {
      createEventAndNavigate(selectedEventId)
    }
  }

  return (
    <Section $embedded={embedded}>
      {!embedded && (
        <SectionTitle>{intl.formatMessage(messages.title)}</SectionTitle>
      )}
      <Grid $embedded={embedded}>
        {visibleGroups.map((group) => (
          <Card
            key={group.id}
            $embedded={embedded}
            type="button"
            onClick={() => handleGroupClick(group)}
          >
            <IconCircle $embedded={embedded} size={embedded ? 72 : undefined}>
              <Icon
                color={embedded ? 'white' : 'brandGreenDark'}
                name={group.icon}
                size="xlarge"
              />
            </IconCircle>
            {intl.formatMessage(group.label)}
          </Card>
        ))}
      </Grid>
      {modal}
    </Section>
  )
}
