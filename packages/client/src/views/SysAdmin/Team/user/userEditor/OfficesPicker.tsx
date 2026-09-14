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
import { useIntl } from 'react-intl'
import { useSelector } from 'react-redux'
import styled from 'styled-components'
import {
  UUID,
  JurisdictionReference,
  resolveJurisdictionReference
} from '@opencrvs/commons/client'
import { Text } from '@opencrvs/components'
import { CircleButton } from '@opencrvs/components/lib/buttons'
import { Cross } from '@opencrvs/components/lib/icons'
import { getToken } from '@client/utils/authUtils'
import { getUserDetails } from '@client/profile/profileSelectors'
import { useLocations } from '@client/v2-events/hooks/useLocations'
import { useAdministrativeAreas } from '@client/v2-events/hooks/useAdministrativeAreas'
import { filterLocationsByJurisdiction } from '@client/v2-events/features/events/registered-fields/LocationSearch'
import { SearchableSelect } from '@client/v2-events/components/forms/inputs/SearchableSelect'
import { withSuspense } from '@client/v2-events/components/withSuspense'
import { messages } from '@client/i18n/messages/views/userForm'

const ChipList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
`

const Chip = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px 4px 10px;
  border-radius: 16px;
  background: ${({ theme }) => theme.colors.grey100};
`

const Instruction = styled(Text)`
  margin-bottom: 8px;
`

/**
 * Niger : sélecteur des communes affectées à un utilisateur (recherche + liste
 * de "chips"), utilisé à la place du champ FieldType.LOCATION scalaire pour
 * la page "user.office" de UserEditor.tsx. Volontairement en dehors du
 * pipeline FieldConfig/FormFieldGenerator générique — voir CONTEXTE-PROJET.md
 * pour la justification (étendre FieldType.LOCATION au multi-select aurait un
 * rayon d'impact bien plus large : rendu de certificat, autres formulaires...).
 */
function OfficesPickerComponent({
  value,
  onChange,
  allowedLocations
}: {
  value: UUID[]
  onChange: (ids: UUID[]) => void
  allowedLocations?: JurisdictionReference
}) {
  const intl = useIntl()
  const token = useSelector(getToken)
  const userDetails = useSelector(getUserDetails)
  const { getLocations } = useLocations()
  const { getAdministrativeAreas } = useAdministrativeAreas()
  const locations = getLocations.useSuspenseQuery()
  const administrativeAreas = getAdministrativeAreas.useSuspenseQuery()

  const jurisdictionFilter = resolveJurisdictionReference(
    allowedLocations,
    token
  )

  const availableLocations = useMemo(
    () =>
      filterLocationsByJurisdiction({
        locations,
        administrativeAreas,
        userLocationId: userDetails?.primaryOfficeId,
        jurisdictionFilter
      }),
    [locations, administrativeAreas, userDetails?.primaryOfficeId, jurisdictionFilter]
  )

  const options = availableLocations
    .filter((location) => !value.includes(location.id))
    .map((location) => ({ value: location.id, label: location.name }))

  return (
    <div>
      <Instruction color="grey500" element="p" variant="reg16">
        {intl.formatMessage(messages.registrationOfficeInstruction)}
      </Instruction>
      <SearchableSelect
        id="offices-picker-search"
        options={options}
        value={null}
        onChange={(option) => {
          if (option && !value.includes(option.value)) {
            onChange([...value, option.value])
          }
        }}
      />
      <ChipList>
        {value.map((officeId, index) => (
          <Chip key={officeId}>
            <Text element="span" variant="bold14">
              {locations.get(officeId)?.name ?? officeId}
              {index === 0 &&
                ` (${intl.formatMessage(messages.primaryOffice)})`}
            </Text>
            {value.length > 1 && (
              <CircleButton
                id={`remove-office-${officeId}`}
                onClick={() =>
                  onChange(value.filter((id) => id !== officeId))
                }
              >
                <Cross color="currentColor" />
              </CircleButton>
            )}
          </Chip>
        ))}
      </ChipList>
    </div>
  )
}

export const OfficesPicker = withSuspense(OfficesPickerComponent)
