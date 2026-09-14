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
import { defineMessages, useIntl } from 'react-intl'
import { useNavigate } from 'react-router-dom'
import { Button } from '@opencrvs/components/lib/Button'
import { Select } from '@opencrvs/components/lib/Select'
import { TextInput } from '@opencrvs/components/lib/TextInput'
import { ROUTES } from '@client/v2-events/routes'
import { useUsers } from '@client/v2-events/hooks/useUsers'
import { useLocations } from '@client/v2-events/hooks/useLocations'
import { useVisibleActGroups } from '@client/v2-events/features/events/actGroups'
import { serializeSearchParams } from '@client/v2-events/features/events/Search/utils'

// Niger : le bandeau de titre coloré est désormais fourni par le panneau
// englobant (voir Home.tsx/PanelCard.tsx) — ce composant ne rend plus que
// le contenu du formulaire.
// Niger : couleurs exactes reprises de la feuille de style d'INCI
// (--primary-text-color: #33795c, fournie par l'utilisateur le
// 2026-08-18) plutôt que les teintes vertes génériques du thème.
const SectionTitle = styled.h3`
  ${({ theme }) => theme.fonts.bold14};
  color: #33795c;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  margin: 16px 0 8px 0;
  padding-bottom: 4px;
  border-bottom: 1px solid #58b368;

  &:first-of-type {
    margin-top: 0;
  }
`

const Field = styled.div`
  margin-bottom: 12px;
`

const Label = styled.label`
  display: block;
  ${({ theme }) => theme.fonts.reg14};
  color: #33795c;
  margin-bottom: 4px;
`

const DateRangeRow = styled.div`
  display: flex;
  gap: 8px;

  > div {
    flex: 1;
  }
`

const ButtonRow = styled.div`
  display: flex;
  flex-wrap: nowrap;
  gap: 6px;
  margin-top: 16px;

  > button {
    flex-shrink: 0;
  }
`

const ALL_ACT_TYPES = 'all'

const messages = defineMessages({
  title: {
    id: 'v2.home.simpleSearch.title',
    defaultMessage: 'Recherche simple',
    description: "Titre du panneau de recherche simple sur la page d'accueil"
  },
  townHallSectionTitle: {
    id: 'v2.home.simpleSearch.townHallSection',
    defaultMessage: 'Critères concernant la mairie',
    description: 'Titre de section : critères concernant la mairie'
  },
  personSectionTitle: {
    id: 'v2.home.simpleSearch.personSection',
    defaultMessage: 'Critères concernant la ou les personnes',
    description: 'Titre de section : critères concernant la ou les personnes'
  },
  recordSectionTitle: {
    id: 'v2.home.simpleSearch.recordSection',
    defaultMessage: "Critères concernant l'acte",
    description: "Titre de section : critères concernant l'acte"
  },
  townHall: {
    id: 'v2.home.simpleSearch.townHall',
    defaultMessage: 'Mairie',
    description: 'Libellé du champ mairie/commune'
  },
  actType: {
    id: 'v2.home.simpleSearch.actType',
    defaultMessage: "Type d'Acte",
    description: "Libellé du champ type d'acte"
  },
  allActTypes: {
    id: 'v2.home.simpleSearch.allActTypes',
    defaultMessage: 'Tous',
    description: 'Option "tous les types d\'acte"'
  },
  surname: {
    id: 'v2.home.simpleSearch.surname',
    defaultMessage: 'Nom',
    description: 'Libellé du champ nom'
  },
  firstname: {
    id: 'v2.home.simpleSearch.firstname',
    defaultMessage: 'Prénom',
    description: 'Libellé du champ prénom'
  },
  dateOfEvent: {
    id: 'v2.home.simpleSearch.dateOfEvent',
    defaultMessage: "Date de l'événement",
    description: "Libellé du champ date de l'événement"
  },
  dateFrom: {
    id: 'v2.home.simpleSearch.dateFrom',
    defaultMessage: 'du',
    description: 'Début de la plage de dates'
  },
  dateTo: {
    id: 'v2.home.simpleSearch.dateTo',
    defaultMessage: 'au',
    description: 'Fin de la plage de dates'
  },
  number: {
    id: 'v2.home.simpleSearch.number',
    defaultMessage: 'Numéro',
    description: "Libellé du champ numéro de l'acte"
  },
  search: {
    id: 'v2.home.simpleSearch.search',
    defaultMessage: 'Rechercher',
    description: 'Bouton de recherche'
  },
  clear: {
    id: 'v2.home.simpleSearch.clear',
    defaultMessage: 'Effacer les critères',
    description: 'Bouton de réinitialisation des critères'
  },
  advancedSearch: {
    id: 'v2.home.simpleSearch.advancedSearch',
    defaultMessage: 'Recherche avancée',
    description: 'Bouton vers la recherche avancée'
  }
})

const EMPTY_FORM = {
  actType: ALL_ACT_TYPES,
  surname: '',
  firstname: '',
  dateFrom: '',
  dateTo: '',
  number: ''
}

export function RechercheSimple() {
  const intl = useIntl()
  const navigate = useNavigate()
  const { getLocations } = useLocations()
  const { getMyContext } = useUsers()
  const locations = getLocations.useSuspenseQuery()
  const myContext = getMyContext.useSuspenseQuery()
  const { visibleGroups } = useVisibleActGroups()

  // Niger : "Mairie" ne fait QUE restreindre cette recherche à l'une des
  // communes affectées à l'utilisateur — contrairement à Paramètres/menu
  // profil, ça ne change JAMAIS la commune active de la session (le reste de
  // l'appli reste sur la commune en cours). Voir RechercheSimple.utils.ts.
  const [form, setForm] = React.useState<typeof EMPTY_FORM & { mairieId: string }>(
    () => ({
      ...EMPTY_FORM,
      mairieId: myContext.primaryOfficeId
    })
  )

  // Niger : uniquement les communes affectées à l'utilisateur connecté
  // (bascule multi-commune, §33/§41) — pas toutes les communes du pays.
  const mairieOptions = myContext.officeIds.map((officeId) => ({
    value: officeId,
    label: locations.get(officeId)?.name ?? officeId
  }))

  const actTypeOptions = [
    { value: ALL_ACT_TYPES, label: intl.formatMessage(messages.allActTypes) },
    ...visibleGroups.map((group) => ({
      value: group.id,
      label: intl.formatMessage(group.label)
    }))
  ]

  // Niger : un type d'acte précis suffit à lui seul à activer "Rechercher"
  // (ex: tous les actes de naissance de la commune, sans autre critère).
  const canSearch = Boolean(
    form.surname ||
      form.firstname ||
      form.number ||
      form.dateFrom ||
      form.dateTo ||
      form.actType !== ALL_ACT_TYPES
  )

  function handleSearch() {
    const selectedGroup = visibleGroups.find((group) => group.id === form.actType)

    navigate(
      `${ROUTES.V2.SEARCH.buildPath({})}?${serializeSearchParams({
        term: [form.surname, form.firstname, form.number]
          .filter(Boolean)
          .join(' '),
        eventTypes: selectedGroup?.eventIds.join(','),
        du: form.dateFrom || undefined,
        au: form.dateTo || undefined,
        officeId: form.mairieId
      })}`
    )
  }

  return (
    <>
      <SectionTitle>
        {intl.formatMessage(messages.townHallSectionTitle)}
      </SectionTitle>
      <Field>
        <Label>{intl.formatMessage(messages.townHall)}</Label>
        <Select
          id="simple-search-mairie"
          options={mairieOptions}
          value={form.mairieId}
          onChange={(value: string) =>
            setForm((f) => ({ ...f, mairieId: value }))
          }
        />
      </Field>
      <Field>
        <Label>{intl.formatMessage(messages.actType)}</Label>
        <Select
          id="simple-search-act-type"
          options={actTypeOptions}
          value={form.actType}
          onChange={(value: string) =>
            setForm((f) => ({ ...f, actType: value }))
          }
        />
      </Field>

      <SectionTitle>
        {intl.formatMessage(messages.personSectionTitle)}
      </SectionTitle>
      <Field>
        <Label>{intl.formatMessage(messages.surname)}</Label>
        <TextInput
          value={form.surname}
          onChange={(e) =>
            setForm((f) => ({ ...f, surname: e.target.value }))
          }
        />
      </Field>
      <Field>
        <Label>{intl.formatMessage(messages.firstname)}</Label>
        <TextInput
          value={form.firstname}
          onChange={(e) =>
            setForm((f) => ({ ...f, firstname: e.target.value }))
          }
        />
      </Field>

      <SectionTitle>
        {intl.formatMessage(messages.recordSectionTitle)}
      </SectionTitle>
      <Field>
        <Label>{intl.formatMessage(messages.dateOfEvent)}</Label>
        <DateRangeRow>
          <div>
            <TextInput
              aria-label={intl.formatMessage(messages.dateFrom)}
              type="date"
              value={form.dateFrom}
              onChange={(e) =>
                setForm((f) => ({ ...f, dateFrom: e.target.value }))
              }
            />
          </div>
          <div>
            <TextInput
              aria-label={intl.formatMessage(messages.dateTo)}
              type="date"
              value={form.dateTo}
              onChange={(e) =>
                setForm((f) => ({ ...f, dateTo: e.target.value }))
              }
            />
          </div>
        </DateRangeRow>
      </Field>
      <Field>
        <Label>{intl.formatMessage(messages.number)}</Label>
        <TextInput
          value={form.number}
          onChange={(e) =>
            setForm((f) => ({ ...f, number: e.target.value }))
          }
        />
      </Field>

      <ButtonRow>
        <Button
          disabled={!canSearch}
          id="simple-search-submit"
          size="small"
          type="primary"
          onClick={handleSearch}
        >
          {intl.formatMessage(messages.search)}
        </Button>
        <Button
          id="simple-search-clear"
          size="small"
          type="secondary"
          onClick={() =>
            setForm((f) => ({ ...EMPTY_FORM, mairieId: f.mairieId }))
          }
        >
          {intl.formatMessage(messages.clear)}
        </Button>
        <Button
          id="simple-search-advanced"
          size="small"
          type="tertiary"
          onClick={() => navigate(ROUTES.V2.ADVANCED_SEARCH.path)}
        >
          {intl.formatMessage(messages.advancedSearch)}
        </Button>
      </ButtonRow>
    </>
  )
}
