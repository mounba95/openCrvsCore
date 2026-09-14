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
import { Button, Icon } from '@opencrvs/components'
import { Dialog } from '@opencrvs/components/lib/Dialog'
import { Select } from '@opencrvs/components/lib/Select'
import { Table } from '@opencrvs/components/lib/Table'
import { TextInput } from '@opencrvs/components/lib/TextInput'
import { ColumnContentAlignment } from '@opencrvs/components/lib/common-types'
import { useModal } from '@client/v2-events/hooks/useModal'
import { fetchStatistics, fetchStatisticsLocations } from './statisticsApi'
import { buildGeographicLabel, buildReportPeriod } from './reports/reportLayout'
import { generateDemographicReportPdf } from './reports/demographicReport'
import { generateDeathByAgeReportPdf } from './reports/deathByAgeReport'
import { generateBirthBySexReportPdf } from './reports/birthBySexReport'
import { generateActByModeleReportPdf } from './reports/actByModeleReport'
import { generateOccupationReportPdf } from './reports/occupationReport'

/**
 * Niger, 2026-09-14 : "États statistiques" — catalogue de rapports
 * générables à la demande, calqué sur "Liste des états statistiques
 * disponibles" d'INCI (capture fournie par l'utilisateur). Différent de la
 * page "Statistiques" (tableau de bord vivant, filtres, graphiques) : ici
 * chaque ligne ouvre une petite modale de paramètres (période + niveau
 * géographique) puis télécharge un PDF autonome.
 */
const WideContent = styled(Content)`
  max-width: none;
  margin-left: 20px;
  background: #c5e0b5;
  border-top: 4px solid ${({ theme }) => theme.colors.brandGreen};
`

const ReportsTable = styled.div`
  background: ${({ theme }) => theme.colors.white};
  border: 1px solid ${({ theme }) => theme.colors.grey300};
  border-radius: 4px;
`

const SectionLabel = styled.h3`
  ${({ theme }) => theme.fonts.bold16};
  color: ${({ theme }) => theme.colors.copy};
  margin: 0 0 8px;
`

const ParamRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
`

const ParamLabel = styled.label`
  ${({ theme }) => theme.fonts.reg14};
  color: ${({ theme }) => theme.colors.copy};
  width: 140px;
  flex-shrink: 0;
`

const ParamField = styled.div`
  width: 220px;
`

type ReportId =
  | 'demographic'
  | 'death-by-age'
  | 'birth-by-sex'
  | 'act-by-modele'
  | 'occupation'

interface ReportDefinition {
  id: ReportId
  title: string
  comment: string
}

const REPORTS: ReportDefinition[] = [
  {
    id: 'demographic',
    title: "GEN - Suivi de la démographie de l'état civil",
    comment: "Statistiques de suivi de la démographie de l'état civil"
  },
  {
    id: 'act-by-modele',
    title: "GEN - Nombre d'acte par modèle",
    comment:
      "Répartition transcription / jugement / copie conforme, par type d'acte"
  },
  {
    id: 'death-by-age',
    title: "DEC - Nombre de décès par tranche d'âge",
    comment: "Répartition des décès enregistrés par tranche d'âge"
  },
  {
    id: 'birth-by-sex',
    title: 'NAI - Nombre de naissance par sexe',
    comment: 'Répartition des naissances enregistrées par sexe'
  },
  {
    id: 'occupation',
    title: 'NAI - Suivi des catégories professionnelles',
    comment: 'Professions des pères et mères déclarées à la naissance'
  }
]

const CURRENT_YEAR = new Date().getFullYear()
const ALL = 'all'

export interface ReportModalResult {
  startYear: number
  endYear: number
  regionId?: string
  departmentId?: string
  communeId?: string
}

function ReportParamsModal({
  title,
  close
}: {
  title: string
  close: (result: ReportModalResult | null) => void
}) {
  const locationsQuery = fetchStatisticsLocations
  const [locations, setLocations] = React.useState<
    Awaited<ReturnType<typeof fetchStatisticsLocations>> | undefined
  >(undefined)

  React.useEffect(() => {
    locationsQuery().then(setLocations)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [startYear, setStartYear] = React.useState(String(CURRENT_YEAR))
  const [endYear, setEndYear] = React.useState(String(CURRENT_YEAR))
  const [regionId, setRegionId] = React.useState(ALL)
  const [departmentId, setDepartmentId] = React.useState(ALL)
  const [communeId, setCommuneId] = React.useState(ALL)

  const regions = locations?.regions ?? []
  const departments = (locations?.departments ?? []).filter(
    (department) => regionId === ALL || department.regionId === regionId
  )
  const communes = (locations?.communes ?? []).filter(
    (commune) => departmentId === ALL || commune.departmentId === departmentId
  )

  const parsedStartYear = Number(startYear)
  const parsedEndYear = Number(endYear)
  const isValid =
    Number.isInteger(parsedStartYear) &&
    Number.isInteger(parsedEndYear) &&
    startYear !== '' &&
    endYear !== '' &&
    parsedStartYear <= parsedEndYear

  return (
    <Dialog
      actions={[
        <Button
          key="generate"
          disabled={!isValid}
          id="generate-report"
          size="medium"
          type="primary"
          onClick={() =>
            close({
              startYear: parsedStartYear,
              endYear: parsedEndYear,
              regionId: regionId === ALL ? undefined : regionId,
              departmentId: departmentId === ALL ? undefined : departmentId,
              communeId: communeId === ALL ? undefined : communeId
            })
          }
        >
          Générer le PDF
        </Button>,
        <Button
          key="cancel"
          id="cancel-report"
          size="medium"
          type="secondary"
          onClick={() => close(null)}
        >
          Annuler
        </Button>
      ]}
      headerVariant="green"
      isOpen
      title={title}
      onClose={() => close(null)}
    >
      <ParamRow>
        <ParamLabel htmlFor="report-start-year">Année de début *</ParamLabel>
        <ParamField>
          <TextInput
            id="report-start-year"
            type="number"
            value={startYear}
            onChange={(e) => setStartYear(e.target.value)}
          />
        </ParamField>
      </ParamRow>
      <ParamRow>
        <ParamLabel htmlFor="report-end-year">Année de fin *</ParamLabel>
        <ParamField>
          <TextInput
            id="report-end-year"
            type="number"
            value={endYear}
            onChange={(e) => setEndYear(e.target.value)}
          />
        </ParamField>
      </ParamRow>
      <ParamRow>
        <ParamLabel htmlFor="report-region">Région</ParamLabel>
        <ParamField>
          <Select
            id="report-region"
            options={[
              { value: ALL, label: 'Toutes les régions' },
              ...regions.map((region) => ({ value: region.id, label: region.name }))
            ]}
            value={regionId}
            onChange={(value) => {
              setRegionId(value)
              setDepartmentId(ALL)
              setCommuneId(ALL)
            }}
          />
        </ParamField>
      </ParamRow>
      <ParamRow>
        <ParamLabel htmlFor="report-department">Département</ParamLabel>
        <ParamField>
          <Select
            id="report-department"
            options={[
              { value: ALL, label: 'Tous les départements' },
              ...departments.map((department) => ({
                value: department.id,
                label: department.name
              }))
            ]}
            value={departmentId}
            onChange={(value) => {
              setDepartmentId(value)
              setCommuneId(ALL)
            }}
          />
        </ParamField>
      </ParamRow>
      <ParamRow>
        <ParamLabel htmlFor="report-commune">Commune</ParamLabel>
        <ParamField>
          <Select
            id="report-commune"
            options={[
              { value: ALL, label: 'Toutes les communes' },
              ...communes.map((commune) => ({
                value: commune.id,
                label: commune.name
              }))
            ]}
            value={communeId}
            onChange={setCommuneId}
          />
        </ParamField>
      </ParamRow>
    </Dialog>
  )
}

export function StatisticsReportsPage() {
  const [modal, openModal] = useModal()
  const [isGenerating, setIsGenerating] = React.useState(false)

  async function handleOpenReport(report: ReportDefinition) {
    const result = await openModal<ReportModalResult | null>((close) => (
      <ReportParamsModal close={close} title={report.title} />
    ))

    if (!result) {
      return
    }

    setIsGenerating(true)
    try {
      const [data, locations] = await Promise.all([
        fetchStatistics({
          startDate: `${result.startYear}-01-01`,
          endDate: `${result.endYear}-12-31`,
          regionId: result.regionId,
          departmentId: result.departmentId,
          communeId: result.communeId
        }),
        fetchStatisticsLocations()
      ])

      const period = buildReportPeriod(result.startYear, result.endYear)
      const geography = buildGeographicLabel({
        region: locations.regions.find((r) => r.id === result.regionId)?.name,
        departement: locations.departments.find((d) => d.id === result.departmentId)
          ?.name,
        commune: locations.communes.find((c) => c.id === result.communeId)?.name
      })

      switch (report.id) {
        case 'demographic':
          generateDemographicReportPdf(data, period, geography)
          break
        case 'death-by-age':
          generateDeathByAgeReportPdf(data, period, geography)
          break
        case 'birth-by-sex':
          generateBirthBySexReportPdf(data, period, geography)
          break
        case 'act-by-modele':
          generateActByModeleReportPdf(data, period, geography)
          break
        case 'occupation':
          generateOccupationReportPdf(data, period, geography)
          break
      }
    } finally {
      setIsGenerating(false)
    }
  }

  const columns = [
    { label: 'Titre', width: 35, key: 'title' },
    { label: 'Commentaires', width: 45, key: 'comment' },
    {
      label: 'Actions',
      width: 20,
      key: 'actions',
      alignment: ColumnContentAlignment.RIGHT
    }
  ]

  const rows = REPORTS.map((report) => ({
    title: report.title,
    comment: report.comment,
    actions: (
      <Button
        aria-label={`Générer ${report.title}`}
        disabled={isGenerating}
        size="small"
        type="icon"
        onClick={() => handleOpenReport(report)}
      >
        <Icon name="Eye" size="medium" />
      </Button>
    )
  }))

  return (
    <WideContent size={ContentSize.LARGE} title="États statistiques">
      <SectionLabel>
        Liste des états statistiques disponibles ({REPORTS.length})
      </SectionLabel>
      <ReportsTable>
        <Table
          columns={columns}
          content={rows}
          id="statistics-reports-table"
          noResultText="Aucun état statistique disponible"
        />
      </ReportsTable>
      {modal}
    </WideContent>
  )
}
