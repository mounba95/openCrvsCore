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
import * as React from 'react'
import styled from 'styled-components'
import { Content, ContentSize } from '@opencrvs/components/lib/Content'
import { Button } from '@opencrvs/components/lib/Button'
import { Checkbox } from '@opencrvs/components/lib/Checkbox'
import { TextInput } from '@opencrvs/components/lib/TextInput'
import { useLocations } from '@client/v2-events/hooks/useLocations'
import { usePermissions } from '@client/hooks/useAuthorization'
import {
  useLegalAgeSettings,
  useUpdateLegalAgeSettings
} from '@client/v2-events/features/legalAgeSettings/useLegalAgeSettings'
import {
  useDeclarationDeadlineSettings,
  useUpdateDeclarationDeadlineSettings
} from './useDeclarationDeadlineSettings'

/**
 * Niger : paramètres légaux, voir décret transmis par l'utilisateur —
 * réglages nationaux édités ici :
 * - délais légaux de déclaration (60j / 6 mois en commune d'urgence / 90j
 *   de viduité pour le divorce), lus en direct par le blocage de la
 *   déclaration (`actions/declare/Pages.tsx`) ;
 * - seuils d'âge légaux (écart parent-enfant, âge minimum au mariage), lus
 *   en direct par les avertissements de la page de révision
 *   (`actions/declare/Review.tsx`).
 */

// Niger : fond vert pâle, comme AdvancedSearch.tsx (WideContent) — pas de
// liseré vert sur la carte elle-même car chaque <Section> ci-dessous porte
// déjà le sien (même motif que AdvancedSearch.tsx). Détachée du menu de
// gauche (margin-left) — WorkqueueLayout utilise <Frame> nu (pas
// Frame.LayoutForm), donc pas de règle `${Content} { margin: 0 }` à
// contourner ici.
const AccentContent = styled(Content)`
  margin-left: 20px;
  background: #c5e0b5;
`

const Section = styled.section`
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

const FieldsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
`

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 220px;
`

// Niger : hauteur minimale de deux lignes, alignée en bas — sinon un
// libellé plus long que les autres dans la même ligne (ex. "Délai (commune
// en situation d'urgence)") décale son champ plus bas que les autres
// (même correctif que RegistersPage.tsx, signalé par l'utilisateur le
// 2026-08-18).
const FieldGroupLabel = styled.label`
  ${({ theme }) => theme.fonts.bold14};
  color: ${({ theme }) => theme.colors.copy};
  min-height: 40px;
  display: flex;
  align-items: flex-end;
`

const FieldHint = styled.div`
  ${({ theme }) => theme.fonts.reg12};
  color: ${({ theme }) => theme.colors.grey500};
  margin-top: 4px;
`

const CommuneListHeader = styled.div`
  margin-bottom: 12px;
`

const CommuneList = styled.div`
  display: flex;
  flex-direction: column;
  max-height: 420px;
  overflow-y: auto;
  border: 1px solid ${({ theme }) => theme.colors.grey200};
  border-radius: 4px;
`

const SaveRow = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
`

export function DeclarationDeadlinesPage() {
  const { canManageDeclarationDeadlines } = usePermissions()
  const { getLocations } = useLocations()
  const locations = getLocations.useSuspenseQuery({
    locationType: 'CRVS_OFFICE'
  })
  const { data: settings, isLoading } = useDeclarationDeadlineSettings()
  const { updateSettings, updateCommuneUrgence, isMutating } =
    useUpdateDeclarationDeadlineSettings()
  const { data: ageSettings, isLoading: isLoadingAgeSettings } =
    useLegalAgeSettings()
  const { updateSettings: updateAgeSettings, isMutating: isMutatingAgeSettings } =
    useUpdateLegalAgeSettings()

  const [normalDays, setNormalDays] = React.useState('')
  const [emergencyDays, setEmergencyDays] = React.useState('')
  const [viduiteDays, setViduiteDays] = React.useState('')
  const [communeSearch, setCommuneSearch] = React.useState('')
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [parentChildMinAgeGap, setParentChildMinAgeGap] = React.useState('')
  const [marriageMinAge, setMarriageMinAge] = React.useState('')
  const [ageErrorMessage, setAgeErrorMessage] = React.useState<string | null>(
    null
  )

  React.useEffect(() => {
    if (settings) {
      setNormalDays(String(settings.normalDays))
      setEmergencyDays(String(settings.emergencyDays))
      setViduiteDays(String(settings.viduiteDays))
    }
  }, [settings])

  React.useEffect(() => {
    if (ageSettings) {
      setParentChildMinAgeGap(String(ageSettings.parentChildMinAgeGap))
      setMarriageMinAge(String(ageSettings.marriageMinAge))
    }
  }, [ageSettings])

  const parsedNormalDays = Number(normalDays)
  const parsedEmergencyDays = Number(emergencyDays)
  const parsedViduiteDays = Number(viduiteDays)

  const canSaveSettings =
    Number.isInteger(parsedNormalDays) &&
    parsedNormalDays > 0 &&
    Number.isInteger(parsedEmergencyDays) &&
    parsedEmergencyDays > 0 &&
    Number.isInteger(parsedViduiteDays) &&
    parsedViduiteDays >= 0

  async function handleSaveSettings() {
    setErrorMessage(null)
    try {
      await updateSettings({
        normalDays: parsedNormalDays,
        emergencyDays: parsedEmergencyDays,
        viduiteDays: parsedViduiteDays
      })
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Une erreur est survenue.'
      )
    }
  }

  const parsedParentChildMinAgeGap = Number(parentChildMinAgeGap)
  const parsedMarriageMinAge = Number(marriageMinAge)

  const canSaveAgeSettings =
    Number.isInteger(parsedParentChildMinAgeGap) &&
    parsedParentChildMinAgeGap >= 0 &&
    Number.isInteger(parsedMarriageMinAge) &&
    parsedMarriageMinAge >= 0

  async function handleSaveAgeSettings() {
    setAgeErrorMessage(null)
    try {
      await updateAgeSettings({
        parentChildMinAgeGap: parsedParentChildMinAgeGap,
        marriageMinAge: parsedMarriageMinAge
      })
    } catch (error) {
      setAgeErrorMessage(
        error instanceof Error ? error.message : 'Une erreur est survenue.'
      )
    }
  }

  async function handleToggleCommune(locationId: string, isUrgence: boolean) {
    setErrorMessage(null)
    try {
      await updateCommuneUrgence({ locationId, isUrgence })
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Une erreur est survenue.'
      )
    }
  }

  const urgenceCommuneIds = new Set(settings?.urgenceCommuneIds ?? [])

  const filteredOffices = [...locations.values()]
    .filter((office) =>
      office.name.toLowerCase().includes(communeSearch.toLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name))

  if (!canManageDeclarationDeadlines) {
    return (
      <AccentContent size={ContentSize.LARGE} title="Paramètres légaux">
        <p>
          Ce réglage est national — seul un administrateur ayant une portée
          nationale peut le modifier.
        </p>
      </AccentContent>
    )
  }

  return (
    <AccentContent size={ContentSize.LARGE} title="Paramètres légaux">
      <Section>
        <SectionTitle>Délais légaux (en jours)</SectionTitle>
        <FieldsRow>
          <FieldGroup>
            <FieldGroupLabel htmlFor="NormalDaysInput">
              Délai normal
            </FieldGroupLabel>
            <TextInput
              id="NormalDaysInput"
              type="number"
              value={normalDays}
              onChange={(e) => setNormalDays(e.target.value)}
            />
          </FieldGroup>
          <FieldGroup>
            <FieldGroupLabel htmlFor="EmergencyDaysInput">
              Délai (commune en situation d&apos;urgence)
            </FieldGroupLabel>
            <TextInput
              id="EmergencyDaysInput"
              type="number"
              value={emergencyDays}
              onChange={(e) => setEmergencyDays(e.target.value)}
            />
          </FieldGroup>
          <FieldGroup>
            <FieldGroupLabel htmlFor="ViduiteDaysInput">
              Délai de viduité (divorce/répudiation)
            </FieldGroupLabel>
            <TextInput
              id="ViduiteDaysInput"
              type="number"
              value={viduiteDays}
              onChange={(e) => setViduiteDays(e.target.value)}
            />
          </FieldGroup>
        </FieldsRow>
        <FieldHint>
          Le délai normal (ou celui des communes en situation d&apos;urgence)
          s&apos;applique à tous les actes à partir de la date du fait — pour
          le divorce/répudiation, il ne démarre qu&apos;après le délai de
          viduité.
        </FieldHint>
        {errorMessage && <p>{errorMessage}</p>}
        <SaveRow>
          <Button
            disabled={!canSaveSettings || isLoading}
            loading={isMutating}
            size="medium"
            type="primary"
            onClick={handleSaveSettings}
          >
            Enregistrer les délais
          </Button>
        </SaveRow>
      </Section>

      <Section>
        <SectionTitle>Communes en situation d&apos;urgence</SectionTitle>
        <CommuneListHeader>
          <TextInput
            id="CommuneSearchInput"
            placeholder="Rechercher une commune"
            value={communeSearch}
            onChange={(e) => setCommuneSearch(e.target.value)}
          />
        </CommuneListHeader>
        <CommuneList>
          {filteredOffices.map((office) => (
            <Checkbox
              key={office.id}
              id={`commune-urgence-${office.id}`}
              label={office.name}
              name={`commune-urgence-${office.id}`}
              selected={urgenceCommuneIds.has(office.id)}
              value={office.id}
              onChange={(e) =>
                handleToggleCommune(office.id, e.target.checked)
              }
            />
          ))}
        </CommuneList>
      </Section>

      <Section>
        <SectionTitle>Âges légaux</SectionTitle>
        <FieldsRow>
          <FieldGroup>
            <FieldGroupLabel htmlFor="ParentChildMinAgeGapInput">
              Écart d&apos;âge minimum parent-enfant (années)
            </FieldGroupLabel>
            <TextInput
              id="ParentChildMinAgeGapInput"
              type="number"
              value={parentChildMinAgeGap}
              onChange={(e) => setParentChildMinAgeGap(e.target.value)}
            />
          </FieldGroup>
          <FieldGroup>
            <FieldGroupLabel htmlFor="MarriageMinAgeInput">
              Âge légal minimum au mariage (années)
            </FieldGroupLabel>
            <TextInput
              id="MarriageMinAgeInput"
              type="number"
              value={marriageMinAge}
              onChange={(e) => setMarriageMinAge(e.target.value)}
            />
          </FieldGroup>
        </FieldsRow>
        <FieldHint>
          Le même écart s&apos;applique au père et à la mère par rapport à
          l&apos;enfant. Non respecté = avertissement seulement, l&apos;agent
          peut tout de même soumettre la déclaration.
        </FieldHint>
        {ageErrorMessage && <p>{ageErrorMessage}</p>}
        <SaveRow>
          <Button
            disabled={!canSaveAgeSettings || isLoadingAgeSettings}
            loading={isMutatingAgeSettings}
            size="medium"
            type="primary"
            onClick={handleSaveAgeSettings}
          >
            Enregistrer les âges
          </Button>
        </SaveRow>
      </Section>
    </AccentContent>
  )
}
