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
import React, { useMemo } from 'react'
import { useSelector } from 'react-redux'
import styled from 'styled-components'
import {
  AdministrativeAreaField,
  getAdministrativeAreaHierarchy,
  JurisdictionFilter,
  Location,
  resolveJurisdictionReference,
  UUID
} from '@opencrvs/commons/client'
import { Stringifiable } from '@client/v2-events/components/forms/utils'
import { EMPTY_TOKEN } from '@client/v2-events/messages/utils'
import { withSuspense } from '@client/v2-events/components/withSuspense'
import { getUserDetails } from '@client/profile/profileSelectors'
import { getToken } from '@client/utils/authUtils'
import {
  SearchableSelect,
  SearchableSelectProps
} from '@client/v2-events/components/forms/inputs/SearchableSelect'
import { useAdministrativeAreas } from '@client/v2-events/hooks/useAdministrativeAreas'
import { useLocations } from '@client/v2-events/hooks/useLocations'
import { getOfflineData } from '@client/offline/selectors'
import { LocationSearch } from './LocationSearch'

/**
 * Return the full administrative area hierarchy for the user's location.
 * For example, if the user's location is Ibombo District Office, this will return the administrative areas objects for:
 * [Central, Ibombo]
 */
function useUserAdministrativeAreaHierarchy() {
  const userDetails = useSelector(getUserDetails)
  const { getAdministrativeAreas } = useAdministrativeAreas()
  const administrativeAreas = getAdministrativeAreas.useSuspenseQuery()
  const { getLocations } = useLocations()
  const locations = getLocations.useSuspenseQuery()
  const userLocationId = userDetails?.primaryOfficeId

  // Niger : `useMemo` doit être appelé inconditionnellement (règles des
  // Hooks React) — un ancien `return []` anticipé avant ce `useMemo`
  // provoquait un nombre de hooks différent d'un rendu à l'autre dès que
  // `userLocationId`/`location` changeait de statut (ex. le temps que
  // `getLocations` se résolve), faisant planter toute la page contenant un
  // champ ADMINISTRATIVE_AREA (« Rendered fewer/more hooks than expected »).
  const parsedUserLocationId = userLocationId
    ? UUID.safeParse(userLocationId).data
    : undefined
  const location = parsedUserLocationId
    ? locations.get(parsedUserLocationId)
    : undefined

  const hierarchy = useMemo(
    () =>
      location
        ? getAdministrativeAreaHierarchy(
            location.administrativeAreaId,
            administrativeAreas
          )
        : [],
    [location, administrativeAreas]
  )

  return hierarchy
}

/**
 * Given a parent id, return the administrative area options for the parent. The options will be filtered based on the jurisdiction filter.
 * If parentId is null, we are at the root level of the administrative area hierarchy.
 */
function useAvailableAdministrativeAreas(
  parentId?: string | null,
  jurisdictionFilter?: JurisdictionFilter
) {
  const { getAdministrativeAreas } = useAdministrativeAreas()
  const administrativeAreas = getAdministrativeAreas.useSuspenseQuery()
  const userAdministrativeAreaHierarchy = useUserAdministrativeAreaHierarchy()
  const { config } = useSelector(getOfflineData)
  /**
   * Niger : quand le champ ne restreint pas la recherche à un parent précis
   * (`parentId === undefined`, ex: chercher n'importe quelle commune du pays
   * sans passer par région → département d'abord), il n'y a rien d'autre
   * pour distinguer les niveaux — sans ce filtre, régions et départements
   * apparaissaient aussi dans la liste "commune" (avec un libellé du genre
   * "Département (Région)"), pas seulement les vraies communes. On ne
   * garde donc que les zones au niveau le plus profond de la hiérarchie
   * (le dernier niveau de `config.ADMIN_STRUCTURE` — Commune/Arrondissement
   * pour le Niger). Sans effet quand `parentId` est déjà défini : dans ce
   * cas la hiérarchie est déjà correctement filtrée par niveau via la
   * relation parent/enfant.
   *
   * Exception : un département "Ville de X" (Niamey, Zinder, Maradi, Tahoua —
   * découpé en plusieurs arrondissements communaux) doit rester sélectionnable
   * lui aussi dans cette même liste, en plus de ses arrondissements. En
   * pratique, la plupart des déclarations mentionnent juste "Zinder" ou
   * "Niamey" comme lieu de naissance, sans préciser l'arrondissement — si
   * seuls les arrondissements étaient proposés, ce cas courant n'aurait pas
   * d'option correspondante. Détecté via le même préfixe "Ville de " déjà
   * utilisé côté certificats (`formatDepartmentLabel`, countryconfig) — pas
   * de niveau dédié dans le modèle de données, juste une convention de nom.
   */
  const leafDepth = config.ADMIN_STRUCTURE.length - 1
  const VILLE_PREFIX = /^ville de /i

  const options = React.useMemo(() => {
    return [...administrativeAreas.values()].filter((administrativeArea) => {
      if (parentId === undefined) {
        if (VILLE_PREFIX.test(administrativeArea.name)) {
          return true
        }
        return (
          getAdministrativeAreaHierarchy(administrativeArea.id, administrativeAreas)
            .length -
            1 ===
          leafDepth
        )
      }

      return administrativeArea.parentId === parentId
    })
  }, [administrativeAreas, parentId, leafDepth])

  // When jurisdictionFilter is not "all", restrict options to the user's own area hierarchy.
  // e.g. a LOCAL_REGISTRAR sees only their province/district; a COMMUNITY_LEADER sees only their province/district/village.
  const hierarchyOptions = options.filter((o) =>
    userAdministrativeAreaHierarchy.some(({ id }) => id === o.id)
  )
  if (
    jurisdictionFilter !== JurisdictionFilter.enum.all &&
    hierarchyOptions.length > 0
  ) {
    return hierarchyOptions
  }

  // By default or if jurisdiction is all, we show all options
  return options
}

/**
 * Niger : quand `configuration.type` désigne un type de lieu concret
 * (formation sanitaire, bureau d'état civil) plutôt qu'une simple division
 * administrative, on ne cherche plus dans la hiérarchie des zones
 * administratives mais dans les lieux eux-mêmes (`useLocations`). Si le
 * champ ne définit pas de `partOf`, `parentId` vaut `undefined` et la liste
 * n'est pas filtrée par zone. Si un `partOf` est défini mais pas encore
 * renseigné, `parentId` vaut `null` et la liste est vide en attendant.
 */
function useAvailableFacilities(
  parentId: string | null | undefined,
  locationType: string
) {
  const { getLocations } = useLocations()
  const locations = getLocations.useSuspenseQuery()

  return React.useMemo(() => {
    if (parentId === null) {
      return []
    }
    return [...locations.values()].filter(
      (location) =>
        location.locationType === locationType &&
        (parentId === undefined || location.administrativeAreaId === parentId)
    )
  }, [locations, parentId, locationType])
}

/**
 * Niger : bouton pour réinitialiser explicitement une commune pré-remplie
 * automatiquement (voir `defaultCommuneToUser` dans birth/forms/declaration.ts)
 * — en rouge et en dehors du champ, pour bien le distinguer d'une simple
 * action de sélection. Réservé aux champs "commune" (ADMIN_STRUCTURE) : la
 * formation sanitaire n'a pas de valeur pré-remplie à réinitialiser.
 */
const FieldRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
`
const SelectWrapper = styled.div`
  flex: 1;
  min-width: 0;
`
const ClearButton = styled.button`
  flex-shrink: 0;
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.negative};
  ${({ theme }) => theme.fonts.bold16};
  line-height: 1;
`

/**
 * Niger : une fois une commune renseignée (pré-remplie automatiquement ou
 * choisie par l'utilisateur), le champ s'affiche grisé/en lecture seule —
 * seule la croix rouge à côté permet de le déverrouiller pour en choisir
 * une autre. Évite qu'on modifie par erreur une commune déjà correcte, tout
 * en gardant le cas exceptionnel (naissance survenue ailleurs) accessible
 * en un clic.
 */
const LockedDisplay = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  height: 32px;
  padding: 0 12px;
  background: ${({ theme }) => theme.colors.grey100};
  border: 1px solid ${({ theme }) => theme.colors.grey300};
  border-radius: 4px;
  color: ${({ theme }) => theme.colors.grey500};
  ${({ theme }) => theme.fonts.reg14};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

interface AdministrativeAreaInputProps
  extends Omit<
    SearchableSelectProps,
    'data-testid' | 'value' | 'onChange' | 'options'
  > {
  configuration: AdministrativeAreaField['configuration']
  eventType?: string
  partOf: string | null | undefined
  onChange: (val: string | null) => void
  value?: string | null
}

function AdministrativeAreaInput({
  configuration,
  eventType,
  value,
  partOf,
  onChange,
  ...inputProps
}: AdministrativeAreaInputProps) {
  const token = useSelector(getToken)
  const jurisdictionFilter = resolveJurisdictionReference(
    configuration.allowedLocations,
    token,
    eventType
  )

  const isCommuneType = configuration.type === 'ADMIN_STRUCTURE'
  const isFacilityType = !isCommuneType

  const administrativeAreas = useAvailableAdministrativeAreas(
    isFacilityType ? undefined : partOf,
    jurisdictionFilter
  )
  const facilities = useAvailableFacilities(partOf, configuration.type)
  const { getAdministrativeAreas } = useAdministrativeAreas()
  const administrativeAreasById = getAdministrativeAreas.useSuspenseQuery()

  const options = useMemo(
    () =>
      isFacilityType
        ? facilities.map((o) => ({ label: o.name, value: o.id }))
        : administrativeAreas.map((o) => {
            const parentName = o.parentId
              ? administrativeAreasById.get(o.parentId)?.name
              : undefined
            return {
              label: parentName ? `${o.name} (${parentName})` : o.name,
              value: o.id
            }
          }),
    [isFacilityType, facilities, administrativeAreas, administrativeAreasById]
  )

  const selectedLocation = useMemo(
    () => options.find((o) => o.value === value) ?? null,
    [options, value]
  )

  /** If there is only one option and its selected, lets disable the input. */
  const hasOnlyOneOption = options.length === 1 && Boolean(selectedLocation)

  const select = (
    <SearchableSelect
      {...inputProps}
      data-testid={'location__' + inputProps.id}
      disabled={inputProps.disabled || hasOnlyOneOption}
      options={options}
      value={selectedLocation}
      onChange={(opt) => {
        onChange(opt?.value ?? null)
      }}
    />
  )

  if (!isCommuneType) {
    return select
  }

  return (
    <FieldRow>
      <SelectWrapper>
        {selectedLocation ? (
          <LockedDisplay>{selectedLocation.label}</LockedDisplay>
        ) : (
          select
        )}
      </SelectWrapper>
      {selectedLocation && (
        <ClearButton
          aria-label="Réinitialiser la commune"
          type="button"
          onClick={() => onChange(null)}
        >
          ✕
        </ClearButton>
      )}
    </FieldRow>
  )
}

function AdministrativeAreaOutput({
  value
}: {
  value: Stringifiable | undefined
}) {
  const { getAdministrativeAreas } = useAdministrativeAreas()
  const administrativeAreas = getAdministrativeAreas.useSuspenseQuery()

  const administrativeAreaId = UUID.safeParse(value?.toString()).data

  const administrativeArea =
    administrativeAreaId && administrativeAreas.get(administrativeAreaId)

  return administrativeArea?.name ?? ''
}

function stringify(value: string, context: { locations: Map<UUID, Location> }) {
  const locationId = UUID.safeParse(value).data
  const location = locationId && context.locations.get(locationId)

  const name = location?.name
  return name ?? EMPTY_TOKEN
}

function isAdministrativeAreaEmpty(value: Stringifiable) {
  return !value.toString()
}

export const AdministrativeArea = {
  Input: withSuspense(AdministrativeAreaInput),
  Output: AdministrativeAreaOutput,
  stringify,
  toCertificateVariables: LocationSearch.toCertificateVariables,
  isEmptyValue: isAdministrativeAreaEmpty
}
