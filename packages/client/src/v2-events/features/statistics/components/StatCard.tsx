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

const Card = styled.div<{ $color: string }>`
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 180px;
  padding: 16px;
  background: ${({ theme }) => theme.colors.white};
  border: 1px solid ${({ theme }) => theme.colors.grey300};
  border-left: 4px solid ${({ $color }) => $color};
  border-radius: 4px;
`

const Label = styled.span`
  ${({ theme }) => theme.fonts.bold12};
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.grey500};
`

const Value = styled.span`
  ${({ theme }) => theme.fonts.h1};
  color: ${({ theme }) => theme.colors.copy};
`

interface StatCardProps {
  label: string
  value: number
  color: string
}

export function StatCard({ label, value, color }: StatCardProps) {
  return (
    <Card $color={color}>
      <Label>{label}</Label>
      <Value>{value.toLocaleString('fr-FR')}</Value>
    </Card>
  )
}
