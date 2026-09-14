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
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import styled, { useTheme } from 'styled-components'
import { Select } from '@opencrvs/components/lib/Select'
import { MonthRow } from '../statisticsApi'

const Header = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 8px;
`

const Title = styled.h3`
  ${({ theme }) => theme.fonts.h4};
  color: ${({ theme }) => theme.colors.copy};
`

const SelectGroup = styled.div`
  display: flex;
  gap: 8px;
`

const YearSelect = styled.div`
  min-width: 130px;
`

const MonthSelect = styled.div`
  min-width: 160px;
`

const EmptyState = styled.p`
  ${({ theme }) => theme.fonts.reg14};
  color: ${({ theme }) => theme.colors.grey500};
`

const SelectedMonthSummary = styled.dl`
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  margin: 0 0 16px 0;
  padding: 12px 16px;
  background: ${({ theme }) => theme.colors.grey50};
  border-radius: 4px;
`

const SummaryItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const SummaryLabel = styled.dt`
  ${({ theme }) => theme.fonts.bold12};
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.grey500};
`

const SummaryValue = styled.dd`
  ${({ theme }) => theme.fonts.h3};
  margin: 0;
  color: ${({ theme }) => theme.colors.copy};
`

interface MonthlyTrendChartProps {
  title: string
  data: MonthRow[]
}

function getYear(isoMonth: string): string {
  return isoMonth.slice(0, 4)
}

function formatMonth(isoMonth: string): string {
  const date = new Date(isoMonth)
  return date.toLocaleDateString('fr-FR', { year: 'numeric', month: 'short' })
}

function formatMonthName(isoMonth: string): string {
  const date = new Date(isoMonth)
  return date.toLocaleDateString('fr-FR', { month: 'long' })
}

const ALL_YEARS = ''
const ALL_MONTHS = ''

export function MonthlyTrendChart({ title, data }: MonthlyTrendChartProps) {
  const theme = useTheme()
  const [selectedYear, setSelectedYear] = React.useState<string>(ALL_YEARS)
  const [selectedMonth, setSelectedMonth] = React.useState<string>(ALL_MONTHS)

  const years = Array.from(new Set(data.map((row) => getYear(row.month)))).sort()

  const rowsInSelectedYear = selectedYear
    ? data.filter((row) => getYear(row.month) === selectedYear)
    : data

  const monthOptions = rowsInSelectedYear.map((row) => ({
    value: row.month,
    label: formatMonthName(row.month)
  }))

  const chartData = rowsInSelectedYear.map((row) => ({
    ...row,
    month: formatMonth(row.month)
  }))

  const selectedRow = data.find((row) => row.month === selectedMonth)

  function onYearChange(year: string) {
    setSelectedYear(year)
    setSelectedMonth(ALL_MONTHS)
  }

  return (
    <div>
      <Header>
        <Title>{title}</Title>
        {data.length > 0 && (
          <SelectGroup>
            <YearSelect>
              <Select
                id="MonthlyTrendYearSelect"
                options={[
                  { value: ALL_YEARS, label: 'Toutes les années' },
                  ...years.map((year) => ({ value: year, label: year }))
                ]}
                value={selectedYear}
                onChange={onYearChange}
              />
            </YearSelect>
            <MonthSelect>
              <Select
                id="MonthlyTrendMonthSelect"
                options={[
                  { value: ALL_MONTHS, label: 'Tous les mois' },
                  ...monthOptions
                ]}
                value={selectedMonth}
                onChange={setSelectedMonth}
              />
            </MonthSelect>
          </SelectGroup>
        )}
      </Header>

      {data.length === 0 ? (
        <EmptyState>Aucune donnée pour la période sélectionnée.</EmptyState>
      ) : (
        <>
          {selectedRow && (
            <SelectedMonthSummary>
              <SummaryItem>
                <SummaryLabel>Naissances</SummaryLabel>
                <SummaryValue>{selectedRow.naissances}</SummaryValue>
              </SummaryItem>
              <SummaryItem>
                <SummaryLabel>Décès</SummaryLabel>
                <SummaryValue>{selectedRow.deces}</SummaryValue>
              </SummaryItem>
              <SummaryItem>
                <SummaryLabel>Mariages</SummaryLabel>
                <SummaryValue>{selectedRow.mariages}</SummaryValue>
              </SummaryItem>
              <SummaryItem>
                <SummaryLabel>Divorces</SummaryLabel>
                <SummaryValue>{selectedRow.divorces}</SummaryValue>
              </SummaryItem>
            </SelectedMonthSummary>
          )}
          <ResponsiveContainer height={260} width="100%">
            <LineChart data={chartData}>
              <CartesianGrid stroke={theme.colors.grey200} strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line
                dataKey="naissances"
                name="Naissances"
                stroke={theme.colors.positive}
                strokeWidth={2}
                type="monotone"
              />
              <Line
                dataKey="deces"
                name="Décès"
                stroke={theme.colors.grey500}
                strokeWidth={2}
                type="monotone"
              />
              <Line
                dataKey="mariages"
                name="Mariages"
                stroke={theme.colors.purple}
                strokeWidth={2}
                type="monotone"
              />
              <Line
                dataKey="divorces"
                name="Divorces et répudiations"
                stroke={theme.colors.orange}
                strokeWidth={2}
                type="monotone"
              />
            </LineChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  )
}
