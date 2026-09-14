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
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import styled, { useTheme } from 'styled-components'
import { SexBreakdown } from '../statisticsApi'

const Title = styled.h3`
  ${({ theme }) => theme.fonts.h4};
  color: ${({ theme }) => theme.colors.copy};
  margin-bottom: 8px;
`

const EmptyState = styled.p`
  ${({ theme }) => theme.fonts.reg14};
  color: ${({ theme }) => theme.colors.grey500};
`

interface SexDonutChartProps {
  title: string
  data: SexBreakdown
}

export function SexDonutChart({ title, data }: SexDonutChartProps) {
  const theme = useTheme()

  const slices = [
    { name: 'Masculin', value: data.masculin, color: theme.colors.primary },
    { name: 'Féminin', value: data.feminin, color: theme.colors.purple }
  ].filter((slice) => slice.value > 0)

  return (
    <div>
      <Title>{title}</Title>
      {slices.length === 0 ? (
        <EmptyState>Aucune donnée pour la période sélectionnée.</EmptyState>
      ) : (
        <ResponsiveContainer height={220} width="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              innerRadius={50}
              nameKey="name"
              outerRadius={80}
              paddingAngle={2}
            >
              {slices.map((slice) => (
                <Cell key={slice.name} fill={slice.color} />
              ))}
            </Pie>
            <Legend />
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
