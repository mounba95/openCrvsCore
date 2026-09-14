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
import { useIntl } from 'react-intl'
import { Icon } from '@opencrvs/components/lib/Icon'
import { ActGroup } from './actGroups'

/**
 * Grille d'icônes "un acte par carte", partagée entre l'écran de création
 * (`EventSelection.tsx`) et la recherche avancée (`AdvancedSearch.tsx`) — le
 * même geste ("choisir l'acte d'abord") sert les deux écrans.
 */
const IconGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 16px;
`

const IconCard = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px 8px;
  border: 1px solid ${({ theme }) => theme.colors.grey300};
  border-radius: 4px;
  background: ${({ theme }) => theme.colors.white};
  cursor: pointer;
  ${({ theme }) => theme.fonts.reg16};
  color: ${({ theme }) => theme.colors.copy};

  &:hover {
    border-color: ${({ theme }) => theme.colors.brandGreen};
  }
`

export function ActGroupPicker({
  groups,
  onSelect
}: {
  groups: ActGroup[]
  onSelect: (groupId: string) => void
}) {
  const intl = useIntl()
  return (
    <IconGrid>
      {groups.map((group) => (
        <IconCard
          key={group.id}
          type="button"
          onClick={() => onSelect(group.id)}
        >
          <Icon color="primary" name={group.icon} size="large" />
          {intl.formatMessage(group.label)}
        </IconCard>
      ))}
    </IconGrid>
  )
}
