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
import styled from 'styled-components'
import { defineMessages, MessageDescriptor, useIntl } from 'react-intl'
import { useNavigate } from 'react-router-dom'
import { Button } from '@opencrvs/components/lib/Button'
import { Checkbox } from '@opencrvs/components/lib/Checkbox'
import { Content, ContentSize } from '@opencrvs/components/lib/Content'
import { RadioGroup, RadioSize } from '@opencrvs/components/lib/Radio'
import { Select } from '@opencrvs/components/lib/Select'
import { TextInput } from '@opencrvs/components/lib/TextInput'
import { ROUTES } from '@client/v2-events/routes'
import { useUsers } from '@client/v2-events/hooks/useUsers'
import { useLocations } from '@client/v2-events/hooks/useLocations'
import { useEventConfigurations } from '@client/v2-events/features/events/useEventConfiguration'
import {
  actTypeMessages,
  getBaseActId,
  modelMessages,
  useVisibleActGroups
} from '@client/v2-events/features/events/actGroups'
import { useCountryConfigWorkqueueConfigurations } from '@client/v2-events/features/events/useCountryConfigWorkqueueConfigurations'
import { serializeSearchParams } from '@client/v2-events/features/events/Search/utils'
import {
  DateType,
  ModeleFilter,
  resolveEventsForActeAndModele,
  SexeFilter,
  StatutFilter
} from './AdvancedSearch.utils'

/**
 * Niger : Recherche Avancée en une seule page, inspirée d'INCI (remplace
 * l'ancien parcours en 3 étapes icône d'acte → modèle → onglet par
 * événement). Mise en page en colonne unique (un champ par ligne,
 * libellé à gauche) — calquée directement sur l'écran réel d'INCI
 * (capture fournie par l'utilisateur), qui évite les problèmes de
 * retour à la ligne d'une grille multi-colonnes. Champs sans équivalent
 * connu dans notre système (Anciens noms, Rôle, Format, Bloqué en
 * Copie/Extrait, Actes annulés, Naissance Hors Commune, Marqueur, Acte
 * manquant, NIEP) volontairement omis pour cette passe — à ajouter un par
 * un une fois leur sens confirmé.
 */
// Niger : fond vert pâle + détaché du menu de gauche, comme la page de
// déclaration (voir FormWizard.tsx) — calqué sur la Recherche Avancée
// d'INCI (capture fournie le 2026-08-18). Largeur en pourcentage (au moins
// la moitié de l'écran, demande utilisateur du 2026-08-18) plutôt qu'un
// plafond fixe trop étroit sur les grands écrans.
const WideContent = styled(Content)`
  width: 60%;
  min-width: 900px;
  max-width: 1400px;
  margin-left: 20px;
  background: #c5e0b5;
`

const InlineRow = styled.div`
  display: flex;
  gap: 24px;

  @media (max-width: ${({ theme }) => theme.grid.breakpoints.md}px) {
    flex-direction: column;
    gap: 4px;
  }
`

// Niger : chaque paire libellé+champ garde sa taille naturelle (pas de
// flex:1 qui écraserait les deux menus déroulants dans l'espace restant
// une fois le libellé fixe de 200px pris deux fois) — corrige les menus
// trop étroits signalés par l'utilisateur (capture du 2026-08-18).
const InlineField = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const CompactLabel = styled.label`
  ${({ theme }) => theme.fonts.reg14};
  color: ${({ theme }) => theme.colors.grey500};
  white-space: nowrap;
  flex-shrink: 0;
`

const CompactSelectField = styled.div`
  width: 200px;
  flex-shrink: 0;
`

const Section = styled.div`
  border-top: 4px solid ${({ theme }) => theme.colors.brandGreen};
  padding: 16px 0;

  &:not(:first-of-type) {
    margin-top: 8px;
  }
`

const SectionTitle = styled.h3`
  ${({ theme }) => theme.fonts.bold14};
  color: ${({ theme }) => theme.colors.grey500};
  text-transform: uppercase;
  letter-spacing: 0.02em;
  margin: 0 0 12px 0;
`

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;

  @media (max-width: ${({ theme }) => theme.grid.breakpoints.md}px) {
    flex-direction: column;
    align-items: stretch;
    gap: 4px;
  }
`

const RowLabel = styled.label`
  ${({ theme }) => theme.fonts.reg14};
  color: ${({ theme }) => theme.colors.grey500};
  width: 200px;
  flex-shrink: 0;
`

const RowField = styled.div`
  flex: 1;
  max-width: 360px;
`

// Niger : champ compact accolé à droite d'une plage de dates sur la même
// ligne (ex. "Date de l'évènement"), au lieu d'une largeur flexible.
const CompactRowField = styled.div`
  width: 220px;
  flex-shrink: 0;
`

const CheckboxRowField = styled.div`
  display: flex;
  gap: 16px;
`

const DateRangeRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;

  > div {
    flex: 1;
  }
`

const DateRangeSeparator = styled.span`
  ${({ theme }) => theme.fonts.reg14};
  color: ${({ theme }) => theme.colors.grey500};
`

const ALL = 'all'
const NO_ACTION = 'none'

const messages = defineMessages({
  title: {
    id: 'v2.advancedSearch.title',
    defaultMessage: 'Recherche avancée',
    description: 'Titre de la page de recherche avancée'
  },
  townHallSectionTitle: {
    id: 'v2.advancedSearch.townHallSection',
    defaultMessage: 'Critères concernant la mairie',
    description: 'Titre de section : critères concernant la mairie'
  },
  personSectionTitle: {
    id: 'v2.advancedSearch.personSection',
    defaultMessage: 'Critères concernant la ou les personnes',
    description: 'Titre de section : critères concernant la ou les personnes'
  },
  recordSectionTitle: {
    id: 'v2.advancedSearch.recordSection',
    defaultMessage: "Critères concernant l'acte",
    description: "Titre de section : critères concernant l'acte"
  },
  actionsSectionTitle: {
    id: 'v2.advancedSearch.actionsSection',
    defaultMessage: 'Actions à faire et critères avancés',
    description: 'Titre de section : actions à faire et critères avancés'
  },
  townHall: {
    id: 'v2.advancedSearch.townHall',
    defaultMessage: 'Mairie',
    description: 'Libellé du champ mairie/commune'
  },
  actType: {
    id: 'v2.advancedSearch.actType',
    defaultMessage: "Type d'Acte",
    description: "Libellé du champ type d'acte"
  },
  modele: {
    id: 'v2.advancedSearch.modele',
    defaultMessage: 'Modèle',
    description: 'Libellé du champ modèle'
  },
  all: {
    id: 'v2.advancedSearch.all',
    defaultMessage: 'Tous',
    description: 'Option "tous"'
  },
  surname: {
    id: 'v2.advancedSearch.surname',
    defaultMessage: 'Nom',
    description: 'Libellé du champ nom'
  },
  firstname: {
    id: 'v2.advancedSearch.firstname',
    defaultMessage: 'Prénom',
    description: 'Libellé du champ prénom'
  },
  sexe: {
    id: 'v2.advancedSearch.sexe',
    defaultMessage: 'Sexe',
    description: 'Libellé du champ sexe'
  },
  sexeMale: {
    id: 'v2.advancedSearch.sexe.male',
    defaultMessage: 'Masculin',
    description: 'Option sexe : masculin'
  },
  sexeFemale: {
    id: 'v2.advancedSearch.sexe.female',
    defaultMessage: 'Féminin',
    description: 'Option sexe : féminin'
  },
  statut: {
    id: 'v2.advancedSearch.statut',
    defaultMessage: 'Statut',
    description: 'Libellé du champ statut'
  },
  statutFinalized: {
    id: 'v2.advancedSearch.statut.finalized',
    defaultMessage: 'Actes finalisés',
    description: 'Option statut : actes finalisés'
  },
  statutNotFinalized: {
    id: 'v2.advancedSearch.statut.notFinalized',
    defaultMessage: 'Actes non finalisés',
    description: 'Option statut : actes non finalisés'
  },
  dateType: {
    id: 'v2.advancedSearch.dateType',
    defaultMessage: 'Type de date',
    description: 'Libellé du sélecteur de type de date'
  },
  dateTypeDateOfEvent: {
    id: 'v2.advancedSearch.dateType.dateOfEvent',
    defaultMessage: "Date de l'événement",
    description: "Option type de date : date de l'événement"
  },
  dateTypeAcceptedAt: {
    id: 'v2.advancedSearch.dateType.acceptedAt',
    defaultMessage: "Date d'enregistrement",
    description: "Option type de date : date d'enregistrement"
  },
  dateTypeUpdatedAt: {
    id: 'v2.advancedSearch.dateType.updatedAt',
    defaultMessage: 'Dernière mise à jour',
    description: 'Option type de date : dernière mise à jour'
  },
  period: {
    id: 'v2.advancedSearch.period',
    defaultMessage: 'Période recherchée',
    description: 'Libellé du champ période'
  },
  dateFrom: {
    id: 'v2.advancedSearch.dateFrom',
    defaultMessage: 'du',
    description: 'Début de la plage de dates'
  },
  dateTo: {
    id: 'v2.advancedSearch.dateTo',
    defaultMessage: 'au',
    description: 'Fin de la plage de dates'
  },
  anneeRegistre: {
    id: 'v2.advancedSearch.anneeRegistre',
    defaultMessage: 'Année du registre',
    description: 'Libellé du champ année du registre'
  },
  number: {
    id: 'v2.advancedSearch.number',
    defaultMessage: "Numéro de l'Acte",
    description: "Libellé du champ numéro de l'acte"
  },
  numeroDeclaration: {
    id: 'v2.advancedSearch.numeroDeclaration',
    defaultMessage: 'N° de la déclaration',
    description: 'Libellé du champ numéro de la déclaration'
  },
  actionsAFaire: {
    id: 'v2.advancedSearch.actionsAFaire',
    defaultMessage: 'Actions à faire',
    description: 'Libellé du champ actions à faire'
  },
  actionPendingUpdates: {
    id: 'v2.advancedSearch.action.pendingUpdates',
    defaultMessage: 'À corriger',
    description: 'Action à faire : à corriger'
  },
  actionPendingValidation: {
    id: 'v2.advancedSearch.action.pendingValidation',
    defaultMessage: 'À vérifier',
    description: 'Action à faire : à vérifier'
  },
  actionPendingRegistration: {
    id: 'v2.advancedSearch.action.pendingRegistration',
    defaultMessage: 'À valider',
    description: 'Action à faire : à valider'
  },
  actionPendingCertification: {
    id: 'v2.advancedSearch.action.pendingCertification',
    defaultMessage: 'À imprimer',
    description: 'Action à faire : à imprimer'
  },
  actionPrinted: {
    id: 'v2.advancedSearch.action.printed',
    defaultMessage: 'Imprimé',
    description: 'Action à faire : imprimé'
  },
  judgmentNumber: {
    id: 'v2.advancedSearch.judgmentNumber',
    defaultMessage: 'N° du jugement',
    description: 'Libellé du champ numéro de jugement'
  },
  originalActNumber: {
    id: 'v2.advancedSearch.originalActNumber',
    defaultMessage: "N° de l'acte d'origine",
    description: "Libellé du champ numéro de l'acte d'origine"
  },
  search: {
    id: 'v2.advancedSearch.search',
    defaultMessage: 'Rechercher',
    description: 'Bouton de recherche'
  },
  clear: {
    id: 'v2.advancedSearch.clear',
    defaultMessage: 'Effacer les critères',
    description: 'Bouton de réinitialisation des critères'
  }
})

const ACTIONS_A_FAIRE: Array<{ slug: string; label: MessageDescriptor }> = [
  { slug: 'pending-updates', label: messages.actionPendingUpdates },
  { slug: 'pending-validation', label: messages.actionPendingValidation },
  { slug: 'pending-registration', label: messages.actionPendingRegistration },
  { slug: 'pending-certification', label: messages.actionPendingCertification },
  { slug: 'printed', label: messages.actionPrinted }
]

const EMPTY_FORM = {
  acteId: ALL,
  modele: ALL as ModeleFilter,
  surname: '',
  firstname: '',
  sexe: ALL as SexeFilter,
  statutFinalized: false,
  statutNotFinalized: false,
  dateType: 'dateOfEvent' as DateType,
  dateFrom: '',
  dateTo: '',
  anneeRegistreFrom: '',
  anneeRegistreTo: '',
  numeroActeFrom: '',
  numeroActeTo: '',
  numeroDeclaration: '',
  actionSlug: NO_ACTION,
  judgmentNumber: '',
  originalActNumber: ''
}

export function AdvancedSearch() {
  const intl = useIntl()
  const navigate = useNavigate()
  const { getLocations } = useLocations()
  const { getMyContext } = useUsers()
  const locations = getLocations.useSuspenseQuery()
  const myContext = getMyContext.useSuspenseQuery()
  const allEvents = useEventConfigurations()
  const { visibleGroups } = useVisibleActGroups()
  const countryConfigWorkqueues = useCountryConfigWorkqueueConfigurations()

  const [form, setForm] = React.useState<
    typeof EMPTY_FORM & { mairieId: string }
  >(() => ({ ...EMPTY_FORM, mairieId: myContext.primaryOfficeId }))

  const mairieOptions = myContext.officeIds.map((officeId) => ({
    value: officeId,
    label: locations.get(officeId)?.name ?? officeId
  }))

  const actTypeOptions = [
    { value: ALL, label: intl.formatMessage(messages.all) },
    ...visibleGroups.map((group) => ({
      value: group.id,
      label: intl.formatMessage(group.label)
    }))
  ]

  // Niger : "Modèle" n'apparaît que si un type d'acte précis est sélectionné
  // (voir plus bas, form.acteId !== ALL) — le libellé de chaque modèle
  // précise donc toujours cet acte (ex: "Déclaration de naissance"), comme
  // pour le sélecteur de modèle de la page d'accueil (actGroups.tsx).
  const selectedBaseActId =
    form.acteId !== ALL ? getBaseActId(form.acteId) : undefined
  const actType = selectedBaseActId
    ? intl.formatMessage(actTypeMessages[selectedBaseActId])
    : ''

  // Niger : mêmes libellés ("Transcription de la déclaration de naissance",
  // etc.) que la modale de sélection de modèle de la page d'accueil — voir
  // modelMessages dans actGroups.tsx, réutilisé ici pour rester synchronisé.
  const modeleOptions = [
    { value: ALL, label: intl.formatMessage(messages.all) },
    {
      value: 'declaration',
      label: intl.formatMessage(modelMessages.declaration, { actType })
    },
    {
      value: 'judgment',
      label: intl.formatMessage(modelMessages.judgment, { actType })
    },
    {
      value: 'certified-copy',
      label: intl.formatMessage(modelMessages.certifiedCopy, { actType })
    },
    {
      value: 'certified-copy-before-1985',
      label: intl.formatMessage(modelMessages.certifiedCopyBefore1985, {
        actType
      })
    }
  ]

  const sexeOptions = [
    { value: ALL, label: intl.formatMessage(messages.all) },
    { value: 'male', label: intl.formatMessage(messages.sexeMale) },
    { value: 'female', label: intl.formatMessage(messages.sexeFemale) }
  ]

  const dateTypeOptions = [
    {
      value: 'dateOfEvent',
      label: intl.formatMessage(messages.dateTypeDateOfEvent)
    },
    {
      value: 'acceptedAt',
      label: intl.formatMessage(messages.dateTypeAcceptedAt)
    },
    { value: 'updatedAt', label: intl.formatMessage(messages.dateTypeUpdatedAt) }
  ]

  // Niger : une action à faire n'est proposée que si le rôle de l'utilisateur
  // a réellement accès à la file d'attente correspondante.
  const actionOptions = [
    { value: NO_ACTION, label: intl.formatMessage(messages.all) },
    ...ACTIONS_A_FAIRE.filter((action) =>
      countryConfigWorkqueues.some((w) => w.slug === action.slug)
    ).map((action) => ({
      value: action.slug,
      label: intl.formatMessage(action.label)
    }))
  ]

  const isActionSelected = form.actionSlug !== NO_ACTION

  // Niger : "Statut" — deux cases indépendantes comme sur l'écran réel
  // d'INCI (au lieu d'un choix exclusif à 3 valeurs) : aucune case cochée,
  // ou les deux, équivaut à "tous" ; une seule cochée filtre sur ce statut.
  const statut: StatutFilter =
    form.statutFinalized === form.statutNotFinalized
      ? (ALL as StatutFilter)
      : form.statutFinalized
        ? 'finalized'
        : 'not-finalized'

  // Niger : un type d'acte ou un modèle précis suffit à lui seul à activer
  // "Rechercher" — même règle que Recherche simple (page d'accueil).
  const canSearch = Boolean(
    form.surname ||
      form.firstname ||
      form.numeroActeFrom ||
      form.numeroActeTo ||
      form.numeroDeclaration ||
      (form.dateFrom && form.dateTo) ||
      form.anneeRegistreFrom ||
      form.anneeRegistreTo ||
      form.judgmentNumber ||
      form.originalActNumber ||
      form.sexe !== ALL ||
      statut !== ALL ||
      form.acteId !== ALL ||
      form.modele !== ALL ||
      isActionSelected
  )

  function handleSearch() {
    const eventIds = resolveEventsForActeAndModele(
      visibleGroups,
      allEvents,
      form.acteId,
      form.modele
    ).map((event) => event.id)

    navigate(
      `${ROUTES.V2.SEARCH.buildPath({})}?${serializeSearchParams({
        term: [form.surname, form.firstname].filter(Boolean).join(' '),
        eventTypes: eventIds.join(','),
        officeId: form.mairieId,
        sexe: form.sexe !== ALL ? form.sexe : undefined,
        statut: statut !== ALL ? statut : undefined,
        dateType:
          form.dateFrom && form.dateTo ? form.dateType : undefined,
        du: form.dateFrom || undefined,
        au: form.dateTo || undefined,
        anneeRegistreFrom: form.anneeRegistreFrom || undefined,
        anneeRegistreTo: form.anneeRegistreTo || undefined,
        numeroActeFrom: form.numeroActeFrom || undefined,
        numeroActeTo: form.numeroActeTo || undefined,
        numeroDeclaration: form.numeroDeclaration || undefined,
        judgmentNumber: form.judgmentNumber || undefined,
        originalActNumber: form.originalActNumber || undefined,
        actionSlug: isActionSelected ? form.actionSlug : undefined
      })}`
    )
  }

  return (
    <WideContent
      bottomActionButtons={[
        <Button
          key="advanced-search-submit"
          disabled={!canSearch}
          id="advanced-search-submit"
          type="primary"
          onClick={handleSearch}
        >
          {intl.formatMessage(messages.search)}
        </Button>,
        <Button
          key="advanced-search-clear"
          id="advanced-search-clear"
          type="secondary"
          onClick={() =>
            setForm((f) => ({ ...EMPTY_FORM, mairieId: f.mairieId }))
          }
        >
          {intl.formatMessage(messages.clear)}
        </Button>
      ]}
      size={ContentSize.LARGE}
      title={intl.formatMessage(messages.title)}
    >
      <Section>
        <SectionTitle>
          {intl.formatMessage(messages.townHallSectionTitle)}
        </SectionTitle>
        <Row>
          {/* Niger : Mairie et Type d'Acte sur la même ligne, comme sur
              l'écran réel d'INCI (capture fournie le 2026-08-18). */}
          <InlineRow>
            <InlineField>
              <CompactLabel>{intl.formatMessage(messages.townHall)}</CompactLabel>
              <CompactSelectField>
                <Select
                  disabled={isActionSelected}
                  id="advanced-search-mairie"
                  options={mairieOptions}
                  value={
                    isActionSelected ? myContext.primaryOfficeId : form.mairieId
                  }
                  onChange={(value: string) =>
                    setForm((f) => ({ ...f, mairieId: value }))
                  }
                />
              </CompactSelectField>
            </InlineField>
            <InlineField>
              <CompactLabel>{intl.formatMessage(messages.actType)}</CompactLabel>
              <CompactSelectField>
                <Select
                  id="advanced-search-act-type"
                  options={actTypeOptions}
                  value={form.acteId}
                  onChange={(value: string) =>
                    setForm((f) => ({ ...f, acteId: value }))
                  }
                />
              </CompactSelectField>
            </InlineField>
          </InlineRow>
        </Row>
        {/* Niger : "Modèle" n'apparaît que si un type d'acte précis est
            sélectionné — comme sur l'écran réel d'INCI, où il reste vide/
            masqué tant que "Type d'Acte" vaut "Tous". */}
        {form.acteId !== ALL && (
        <Row>
          <RowLabel>{intl.formatMessage(messages.modele)}</RowLabel>
          <RowField>
            <Select
              id="advanced-search-modele"
              options={modeleOptions}
              value={form.modele}
              onChange={(value: string) =>
                setForm((f) => ({ ...f, modele: value as ModeleFilter }))
              }
            />
          </RowField>
        </Row>
        )}
      </Section>

      <Section>
        <SectionTitle>
          {intl.formatMessage(messages.personSectionTitle)}
        </SectionTitle>
        <Row>
          <RowLabel>{intl.formatMessage(messages.surname)}</RowLabel>
          <RowField>
            <TextInput
              value={form.surname}
              onChange={(e) =>
                setForm((f) => ({ ...f, surname: e.target.value }))
              }
            />
          </RowField>
        </Row>
        <Row>
          <RowLabel>{intl.formatMessage(messages.firstname)}</RowLabel>
          <RowField>
            <TextInput
              value={form.firstname}
              onChange={(e) =>
                setForm((f) => ({ ...f, firstname: e.target.value }))
              }
            />
          </RowField>
        </Row>
        <Row>
          <RowLabel>{intl.formatMessage(messages.sexe)}</RowLabel>
          <RadioGroup
            name="advanced-search-sexe"
            options={sexeOptions}
            size={RadioSize.NORMAL}
            value={form.sexe}
            onChange={(value) =>
              setForm((f) => ({ ...f, sexe: value as SexeFilter }))
            }
          />
        </Row>
      </Section>

      <Section>
        <SectionTitle>
          {intl.formatMessage(messages.recordSectionTitle)}
        </SectionTitle>
        <Row>
          <RowLabel>{intl.formatMessage(messages.statut)}</RowLabel>
          <CheckboxRowField>
            <Checkbox
              disabled={isActionSelected}
              id="advanced-search-statut-finalized"
              label={intl.formatMessage(messages.statutFinalized)}
              name="advanced-search-statut-finalized"
              selected={!isActionSelected && form.statutFinalized}
              value="finalized"
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  statutFinalized: e.target.checked,
                  actionSlug: NO_ACTION
                }))
              }
            />
            <Checkbox
              disabled={isActionSelected}
              id="advanced-search-statut-not-finalized"
              label={intl.formatMessage(messages.statutNotFinalized)}
              name="advanced-search-statut-not-finalized"
              selected={!isActionSelected && form.statutNotFinalized}
              value="not-finalized"
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  statutNotFinalized: e.target.checked,
                  actionSlug: NO_ACTION
                }))
              }
            />
          </CheckboxRowField>
        </Row>
        <Row>
          <RowLabel>{intl.formatMessage(messages.period)}</RowLabel>
          <DateRangeRow>
            <TextInput
              aria-label={intl.formatMessage(messages.dateFrom)}
              type="date"
              value={form.dateFrom}
              onChange={(e) =>
                setForm((f) => ({ ...f, dateFrom: e.target.value }))
              }
            />
            <DateRangeSeparator>
              {intl.formatMessage(messages.dateTo)}
            </DateRangeSeparator>
            <TextInput
              aria-label={intl.formatMessage(messages.dateTo)}
              type="date"
              value={form.dateTo}
              onChange={(e) =>
                setForm((f) => ({ ...f, dateTo: e.target.value }))
              }
            />
          </DateRangeRow>
          {/* Niger : type de date sur la même ligne que la période, comme
              sur l'écran réel d'INCI (capture fournie le 2026-08-18). */}
          <CompactRowField>
            <Select
              id="advanced-search-date-type"
              options={dateTypeOptions}
              value={form.dateType}
              onChange={(value: string) =>
                setForm((f) => ({ ...f, dateType: value as DateType }))
              }
            />
          </CompactRowField>
        </Row>
        <Row>
          <RowLabel>{intl.formatMessage(messages.number)}</RowLabel>
          <DateRangeRow>
            <TextInput
              aria-label={intl.formatMessage(messages.dateFrom)}
              type="number"
              value={form.numeroActeFrom}
              onChange={(e) =>
                setForm((f) => ({ ...f, numeroActeFrom: e.target.value }))
              }
            />
            <DateRangeSeparator>
              {intl.formatMessage(messages.dateTo)}
            </DateRangeSeparator>
            <TextInput
              aria-label={intl.formatMessage(messages.dateTo)}
              type="number"
              value={form.numeroActeTo}
              onChange={(e) =>
                setForm((f) => ({ ...f, numeroActeTo: e.target.value }))
              }
            />
          </DateRangeRow>
        </Row>
        <Row>
          <RowLabel>{intl.formatMessage(messages.anneeRegistre)}</RowLabel>
          <DateRangeRow>
            <TextInput
              aria-label={intl.formatMessage(messages.dateFrom)}
              type="number"
              value={form.anneeRegistreFrom}
              onChange={(e) =>
                setForm((f) => ({ ...f, anneeRegistreFrom: e.target.value }))
              }
            />
            <DateRangeSeparator>
              {intl.formatMessage(messages.dateTo)}
            </DateRangeSeparator>
            <TextInput
              aria-label={intl.formatMessage(messages.dateTo)}
              type="number"
              value={form.anneeRegistreTo}
              onChange={(e) =>
                setForm((f) => ({ ...f, anneeRegistreTo: e.target.value }))
              }
            />
          </DateRangeRow>
        </Row>
      </Section>

      <Section>
        <SectionTitle>
          {intl.formatMessage(messages.actionsSectionTitle)}
        </SectionTitle>
        {/* Niger : un seul de ces trois champs à la fois, selon le modèle
            précis choisi (jamais tous les trois en même temps, y compris
            quand "Modèle" vaut "Tous") — comme sur l'écran réel d'INCI,
            signalé par l'utilisateur le 2026-08-18. */}
        {form.modele === 'declaration' && (
          <Row>
            <RowLabel>{intl.formatMessage(messages.numeroDeclaration)}</RowLabel>
            <RowField>
              <TextInput
                value={form.numeroDeclaration}
                onChange={(e) =>
                  setForm((f) => ({ ...f, numeroDeclaration: e.target.value }))
                }
              />
            </RowField>
          </Row>
        )}
        {form.modele === 'judgment' && (
          <Row>
            <RowLabel>{intl.formatMessage(messages.judgmentNumber)}</RowLabel>
            <RowField>
              <TextInput
                value={form.judgmentNumber}
                onChange={(e) =>
                  setForm((f) => ({ ...f, judgmentNumber: e.target.value }))
                }
              />
            </RowField>
          </Row>
        )}
        {(form.modele === 'certified-copy' ||
          form.modele === 'certified-copy-before-1985') && (
          <Row>
            <RowLabel>
              {intl.formatMessage(messages.originalActNumber)}
            </RowLabel>
            <RowField>
              <TextInput
                value={form.originalActNumber}
                onChange={(e) =>
                  setForm((f) => ({ ...f, originalActNumber: e.target.value }))
                }
              />
            </RowField>
          </Row>
        )}
        <Row>
          <RowLabel>{intl.formatMessage(messages.actionsAFaire)}</RowLabel>
          <RadioGroup
            name="advanced-search-actions-a-faire"
            options={actionOptions}
            size={RadioSize.NORMAL}
            value={form.actionSlug}
            onChange={(value) =>
              setForm((f) => ({
                ...f,
                actionSlug: value,
                mairieId: myContext.primaryOfficeId,
                statutFinalized: false,
                statutNotFinalized: false
              }))
            }
          />
        </Row>
      </Section>
    </WideContent>
  )
}
