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
import styled, { useTheme } from 'styled-components'
import { Content, ContentSize } from '@opencrvs/components/lib/Content'
import { Button, Icon } from '@opencrvs/components'
import { Select } from '@opencrvs/components/lib/Select'
import { Table } from '@opencrvs/components/lib/Table'
import { TextInput } from '@opencrvs/components/lib/TextInput'
import { ColumnContentAlignment } from '@opencrvs/components/lib/common-types'
import { useStatistics, useStatisticsLocations } from './useStatistics'
import { StatisticsFilters } from './statisticsApi'
import { exportStatisticsToExcel, exportStatisticsToPdf } from './export'
import { StatCard } from './components/StatCard'
import { SexDonutChart } from './components/SexDonutChart'
import { MonthlyTrendChart } from './components/MonthlyTrendChart'

/**
 * `Content`'s `size` prop caps width at 1140px (`ContentSize.LARGE`) — un
 * choix voulu pour les formulaires (lisibilité), mais une page de
 * statistiques (graphiques, tableau large) doit utiliser toute la largeur
 * disponible. `styled(Content)` peut surcharger cette règle car `Content`
 * transmet `className` à son conteneur racine (même technique déjà
 * utilisée par `GreenContent` dans `FormWizard.tsx`).
 *
 * Niger : même traitement de carte que les pages Équipe/Organisation/
 * Registres/Paramètres — fond vert pâle + liseré vert, calqué sur INCI (voir
 * FormWizard.tsx). Détachée du menu de gauche (margin-left) —
 * WorkqueueLayout utilise <Frame> nu (pas Frame.LayoutForm), donc pas de
 * règle `${Content} { margin: 0 }` à contourner ici.
 */
const WideContent = styled(Content)`
  max-width: none;
  margin-left: 20px;
  background: #c5e0b5;
  border-top: 4px solid ${({ theme }) => theme.colors.brandGreen};
`

const FilterBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 16px;
  padding: 16px;
  margin-bottom: 24px;
  background: ${({ theme }) => theme.colors.white};
  border: 1px solid ${({ theme }) => theme.colors.grey300};
  border-radius: 4px;
`

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 160px;
`

const FieldGroupLabel = styled.label`
  ${({ theme }) => theme.fonts.bold14};
  color: ${({ theme }) => theme.colors.copy};
`

const FilterActions = styled.div`
  display: flex;
  gap: 8px;
`

const ExportBar = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-bottom: 24px;
`

const StatCardRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 24px;
`

const SectionLabel = styled.h3`
  ${({ theme }) => theme.fonts.bold16};
  color: ${({ theme }) => theme.colors.copy};
  margin: 0 0 8px;
`

const RestrictedNotice = styled.p`
  ${({ theme }) => theme.fonts.reg14};
  color: ${({ theme }) => theme.colors.supportingCopy};
  margin: 0 0 16px;
`

const ChartRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 24px;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
`

const ChartCard = styled.div`
  padding: 16px;
  background: ${({ theme }) => theme.colors.white};
  border: 1px solid ${({ theme }) => theme.colors.grey300};
  border-radius: 4px;
`

const EMPTY_FILTERS: StatisticsFilters = {}

export function StatisticsPage() {
  const theme = useTheme()
  const locationsQuery = useStatisticsLocations()

  const [draftFilters, setDraftFilters] =
    React.useState<StatisticsFilters>(EMPTY_FILTERS)
  const [appliedFilters, setAppliedFilters] =
    React.useState<StatisticsFilters>(EMPTY_FILTERS)

  const statisticsQuery = useStatistics(appliedFilters)

  const regions = locationsQuery.data?.regions ?? []
  const departments = (locationsQuery.data?.departments ?? []).filter(
    (department) =>
      !draftFilters.regionId || department.regionId === draftFilters.regionId
  )
  const communes = (locationsQuery.data?.communes ?? []).filter(
    (commune) =>
      !draftFilters.departmentId ||
      commune.departmentId === draftFilters.departmentId
  )

  function applyFilters() {
    setAppliedFilters(draftFilters)
  }

  function resetFilters() {
    setDraftFilters(EMPTY_FILTERS)
    setAppliedFilters(EMPTY_FILTERS)
  }

  // Niger : l'export reflète ce qui est affiché (filtres déjà appliqués),
  // pas ce qui est en train d'être saisi dans les sélecteurs.
  const allRegions = locationsQuery.data?.regions ?? []
  const allDepartments = locationsQuery.data?.departments ?? []
  const allCommunes = locationsQuery.data?.communes ?? []
  const exportLabels = {
    region: allRegions.find((region) => region.id === appliedFilters.regionId)
      ?.name,
    departement: allDepartments.find(
      (department) => department.id === appliedFilters.departmentId
    )?.name,
    commune: allCommunes.find(
      (commune) => commune.id === appliedFilters.communeId
    )?.name
  }

  function handleExportExcel() {
    if (!statisticsQuery.data) {
      return
    }
    exportStatisticsToExcel(statisticsQuery.data, appliedFilters, exportLabels)
  }

  function handleExportPdf() {
    if (!statisticsQuery.data) {
      return
    }
    exportStatisticsToPdf(statisticsQuery.data, appliedFilters, exportLabels)
  }

  const restrictedToOwnOffices =
    statisticsQuery.data?.restrictedToOwnOffices ?? false
  const nationalTotals = statisticsQuery.data?.nationalTotals ?? {
    naissances: 0,
    deces: 0,
    mariages: 0,
    divorces: 0
  }
  const totals = statisticsQuery.data?.totals ?? {
    naissances: 0,
    deces: 0,
    mariages: 0,
    divorces: 0
  }
  const bySex = statisticsQuery.data?.bySex ?? {
    naissances: { masculin: 0, feminin: 0 },
    deces: { masculin: 0, feminin: 0 }
  }
  const byMonth = statisticsQuery.data?.byMonth ?? []
  const byLocation = statisticsQuery.data?.byLocation ?? []

  const tableRows = byLocation.map((row) => ({
    region: row.region ?? '',
    departement: row.departement ?? '',
    commune: row.commune,
    naissances: String(row.naissances),
    deces: String(row.deces),
    mariages: String(row.mariages),
    divorces: String(row.divorces)
  }))

  const tableColumns = [
    { label: 'Région', width: 18, key: 'region' },
    { label: 'Département', width: 18, key: 'departement' },
    { label: 'Commune', width: 18, key: 'commune' },
    {
      label: 'Naissances',
      width: 11.5,
      key: 'naissances',
      alignment: ColumnContentAlignment.RIGHT
    },
    {
      label: 'Décès',
      width: 11.5,
      key: 'deces',
      alignment: ColumnContentAlignment.RIGHT
    },
    {
      label: 'Mariages',
      width: 11.5,
      key: 'mariages',
      alignment: ColumnContentAlignment.RIGHT
    },
    {
      label: 'Divorces',
      width: 11.5,
      key: 'divorces',
      alignment: ColumnContentAlignment.RIGHT
    }
  ]

  return (
    <WideContent size={ContentSize.LARGE} title="Statistiques">
      <FilterBar>
        <FieldGroup>
          <FieldGroupLabel htmlFor="StatisticsStartDate">Du</FieldGroupLabel>
          <TextInput
            id="StatisticsStartDate"
            type="date"
            value={draftFilters.startDate ?? ''}
            onChange={(e) =>
              setDraftFilters((filters) => ({
                ...filters,
                startDate: e.target.value || undefined
              }))
            }
          />
        </FieldGroup>
        <FieldGroup>
          <FieldGroupLabel htmlFor="StatisticsEndDate">Au</FieldGroupLabel>
          <TextInput
            id="StatisticsEndDate"
            type="date"
            value={draftFilters.endDate ?? ''}
            onChange={(e) =>
              setDraftFilters((filters) => ({
                ...filters,
                endDate: e.target.value || undefined
              }))
            }
          />
        </FieldGroup>
        <FieldGroup>
          <FieldGroupLabel htmlFor="StatisticsRegionSelect">
            Région
          </FieldGroupLabel>
          <Select
            disabled={restrictedToOwnOffices}
            id="StatisticsRegionSelect"
            options={regions.map((region) => ({
              value: region.id,
              label: region.name
            }))}
            placeholder="Toutes les régions"
            value={draftFilters.regionId ?? ''}
            onChange={(value) =>
              setDraftFilters((filters) => ({
                ...filters,
                regionId: value || undefined,
                departmentId: undefined,
                communeId: undefined
              }))
            }
          />
        </FieldGroup>
        <FieldGroup>
          <FieldGroupLabel htmlFor="StatisticsDepartmentSelect">
            Département
          </FieldGroupLabel>
          <Select
            disabled={restrictedToOwnOffices}
            id="StatisticsDepartmentSelect"
            options={departments.map((department) => ({
              value: department.id,
              label: department.name
            }))}
            placeholder="Tous les départements"
            value={draftFilters.departmentId ?? ''}
            onChange={(value) =>
              setDraftFilters((filters) => ({
                ...filters,
                departmentId: value || undefined,
                communeId: undefined
              }))
            }
          />
        </FieldGroup>
        <FieldGroup>
          <FieldGroupLabel htmlFor="StatisticsCommuneSelect">
            Commune
          </FieldGroupLabel>
          <Select
            disabled={restrictedToOwnOffices}
            id="StatisticsCommuneSelect"
            options={communes.map((commune) => ({
              value: commune.id,
              label: commune.name
            }))}
            placeholder="Toutes les communes"
            value={draftFilters.communeId ?? ''}
            onChange={(value) =>
              setDraftFilters((filters) => ({
                ...filters,
                communeId: value || undefined
              }))
            }
          />
        </FieldGroup>
        <FilterActions>
          <Button type="primary" onClick={applyFilters}>
            Appliquer
          </Button>
          <Button type="tertiary" onClick={resetFilters}>
            Réinitialiser
          </Button>
        </FilterActions>
      </FilterBar>

      {restrictedToOwnOffices && (
        <RestrictedNotice>
          Vous voyez uniquement le détail des actes de votre/vos propre(s)
          commune(s) — les filtres région/département/commune sont
          désactivés. Seuls les totaux nationaux ci-dessous portent sur
          l'ensemble du pays.
        </RestrictedNotice>
      )}

      <ExportBar>
        <Button
          disabled={!statisticsQuery.data}
          type="secondary"
          onClick={handleExportExcel}
        >
          <Icon name="Export" />
          Exporter en Excel
        </Button>
        <Button
          disabled={!statisticsQuery.data}
          type="secondary"
          onClick={handleExportPdf}
        >
          <Icon name="Export" />
          Exporter en PDF
        </Button>
      </ExportBar>

      <SectionLabel>Totaux nationaux</SectionLabel>
      <StatCardRow>
        <StatCard
          color={theme.colors.positive}
          label="Naissances - Total national"
          value={nationalTotals.naissances}
        />
        <StatCard
          color={theme.colors.grey500}
          label="Décès - Total national"
          value={nationalTotals.deces}
        />
        <StatCard
          color={theme.colors.purple}
          label="Mariages - Total national"
          value={nationalTotals.mariages}
        />
        <StatCard
          color={theme.colors.orange}
          label="Divorces et répudiations - Total national"
          value={nationalTotals.divorces}
        />
      </StatCardRow>

      <SectionLabel>
        {restrictedToOwnOffices
          ? 'Totaux — ma/mes commune(s)'
          : 'Totaux — zone sélectionnée'}
      </SectionLabel>
      <StatCardRow>
        <StatCard
          color={theme.colors.positive}
          label="Naissances - Total"
          value={totals.naissances}
        />
        <StatCard
          color={theme.colors.grey500}
          label="Décès - Total"
          value={totals.deces}
        />
        <StatCard
          color={theme.colors.purple}
          label="Mariages - Total"
          value={totals.mariages}
        />
        <StatCard
          color={theme.colors.orange}
          label="Divorces et répudiations - Total"
          value={totals.divorces}
        />
      </StatCardRow>

      <ChartRow>
        <ChartCard>
          <MonthlyTrendChart
            data={byMonth}
            title="Actes enregistrés par mois"
          />
        </ChartCard>
        <ChartCard>
          <SexDonutChart
            data={bySex.naissances}
            title="Naissances par sexe"
          />
        </ChartCard>
      </ChartRow>

      {!statisticsQuery.isLoading && (
        <Table
          columns={tableColumns}
          content={tableRows}
          id="statistics-location-table"
          noResultText="Aucune donnée pour la période sélectionnée"
        />
      )}
    </WideContent>
  )
}
