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
import * as XLSX from 'xlsx'
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces'
import pdfMake from 'pdfmake/build/pdfmake'
// `pdfmake/build/vfs_fonts` a un style d'export CommonJS ancien (mutation de
// `this.pdfMake.vfs`) qui n'atterrit pas toujours au même endroit selon la
// façon dont l'interop CJS/ESM du bundler l'enveloppe — on tente les deux
// formes connues plutôt que d'en supposer une seule.
// eslint-disable-next-line @typescript-eslint/no-var-requires
import pdfFonts from 'pdfmake/build/vfs_fonts'
import { StatisticsFilters, StatisticsResponse } from './statisticsApi'

const vfs =
  (pdfFonts as unknown as { vfs?: Record<string, string> }).vfs ??
  (pdfFonts as unknown as { pdfMake?: { vfs: Record<string, string> } })
    .pdfMake?.vfs

if (vfs) {
  pdfMake.vfs = vfs
}

export interface ExportLocationLabels {
  region?: string
  departement?: string
  commune?: string
}

const ACT_LABELS: Record<'naissances' | 'deces' | 'mariages' | 'divorces', string> =
  {
    naissances: 'Naissances',
    deces: 'Décès',
    mariages: 'Mariages',
    divorces: 'Divorces et répudiations'
  }

function formatFilterSummary(
  filters: StatisticsFilters,
  labels: ExportLocationLabels
): string {
  const parts: string[] = []
  if (filters.startDate || filters.endDate) {
    parts.push(
      `Période : du ${filters.startDate ?? '…'} au ${filters.endDate ?? '…'}`
    )
  }
  if (labels.commune) {
    parts.push(`Commune : ${labels.commune}`)
  } else if (labels.departement) {
    parts.push(`Département : ${labels.departement}`)
  } else if (labels.region) {
    parts.push(`Région : ${labels.region}`)
  }
  return parts.length > 0 ? parts.join(' — ') : 'Toutes les données, national'
}

function todayForFilename(): string {
  return new Date().toISOString().slice(0, 10)
}

export function exportStatisticsToExcel(
  data: StatisticsResponse,
  filters: StatisticsFilters,
  labels: ExportLocationLabels
) {
  const workbook = XLSX.utils.book_new()

  const summarySheet = XLSX.utils.aoa_to_sheet([
    ['Statistiques - État civil'],
    [formatFilterSummary(filters, labels)],
    [`Exporté le ${new Date().toLocaleDateString('fr-FR')}`]
  ])
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Résumé')

  const totalsSheet = XLSX.utils.json_to_sheet(
    (Object.keys(ACT_LABELS) as (keyof typeof ACT_LABELS)[]).map((key) => ({
      "Type d'acte": ACT_LABELS[key],
      Total: data.totals[key]
    }))
  )
  XLSX.utils.book_append_sheet(workbook, totalsSheet, 'Totaux')

  const monthSheet = XLSX.utils.json_to_sheet(
    data.byMonth.map((row) => ({
      Mois: row.month,
      Naissances: row.naissances,
      Décès: row.deces,
      Mariages: row.mariages,
      Divorces: row.divorces
    }))
  )
  XLSX.utils.book_append_sheet(workbook, monthSheet, 'Par mois')

  const sexSheet = XLSX.utils.json_to_sheet([
    {
      "Type d'acte": 'Naissances',
      Masculin: data.bySex.naissances.masculin,
      Féminin: data.bySex.naissances.feminin
    },
    {
      "Type d'acte": 'Décès',
      Masculin: data.bySex.deces.masculin,
      Féminin: data.bySex.deces.feminin
    }
  ])
  XLSX.utils.book_append_sheet(workbook, sexSheet, 'Par sexe')

  const locationSheet = XLSX.utils.json_to_sheet(
    data.byLocation.map((row) => ({
      Région: row.region ?? '',
      Département: row.departement ?? '',
      Commune: row.commune,
      Naissances: row.naissances,
      Décès: row.deces,
      Mariages: row.mariages,
      Divorces: row.divorces
    }))
  )
  XLSX.utils.book_append_sheet(
    workbook,
    locationSheet,
    'Région-département-commune'
  )

  const detailedSheet = XLSX.utils.aoa_to_sheet([
    ['Indicateur', 'Valeur'],
    ...detailedIndicatorRows(data)
  ])
  XLSX.utils.book_append_sheet(workbook, detailedSheet, 'Détail par modèle')

  XLSX.writeFile(workbook, `statistiques-${todayForFilename()}.xlsx`)
}

/**
 * Niger, 2026-09-14 : liste des indicateurs détaillés (par modèle) du
 * tableau de bord — voir `tableau_de_bord.pdf` fourni par l'utilisateur.
 * Rangées `[libellé, valeur]`, partagées entre l'export Excel (une feuille)
 * et l'export PDF (un tableau), pour garder les deux exports synchronisés.
 */
function detailedIndicatorRows(
  data: StatisticsResponse
): [string, number | string][] {
  const { detailed, circonstanceNaissance } = data
  return [
    ['Naissances - Transcriptions féminin', detailed.naissances.transcriptions.feminin],
    ['Naissances - Transcriptions masculin', detailed.naissances.transcriptions.masculin],
    ['Naissances - Jugements déclaratifs féminin', detailed.naissances.jugements.feminin],
    ['Naissances - Jugements déclaratifs masculin', detailed.naissances.jugements.masculin],
    ['Naissances - Total des transcriptions', detailed.naissances.transcriptions.total],
    ['Mariages - Transcriptions', detailed.mariages.transcriptions],
    ['Mariages - Jugements déclaratifs', detailed.mariages.jugements],
    ['Divorces - Transcriptions de divorce', detailed.divorces.transcriptionsDivorce],
    ['Divorces - Transcriptions de répudiation', detailed.divorces.transcriptionsRepudiation],
    ['Divorces - Jugements déclaratifs de divorce', detailed.divorces.jugementsDivorce],
    ['Divorces - Jugements déclaratifs de répudiation', detailed.divorces.jugementsRepudiation],
    ['Décès - Transcriptions féminin', detailed.deces.transcriptions.feminin],
    ['Décès - Transcriptions masculin', detailed.deces.transcriptions.masculin],
    ['Décès - Jugements déclaratifs féminin', detailed.deces.jugements.feminin],
    ['Décès - Jugements déclaratifs masculin', detailed.deces.jugements.masculin],
    ['Décès - Total des transcriptions', detailed.deces.transcriptions.total],
    ['Naissances à domicile', circonstanceNaissance.domicile],
    ['Naissances en formation sanitaire', circonstanceNaissance.formationSanitaire]
  ]
}

function toPdfTable(
  headers: string[],
  rows: (string | number)[][]
): Content {
  return {
    table: {
      headerRows: 1,
      widths: headers.map(() => '*'),
      body: [
        headers.map((header) => ({ text: header, bold: true })),
        ...rows.map((row) => row.map((cell) => String(cell)))
      ]
    },
    layout: 'lightHorizontalLines',
    margin: [0, 0, 0, 16]
  }
}

export function exportStatisticsToPdf(
  data: StatisticsResponse,
  filters: StatisticsFilters,
  labels: ExportLocationLabels
) {
  const content: Content[] = [
    { text: 'Statistiques - État civil', style: 'title' },
    {
      text: formatFilterSummary(filters, labels),
      style: 'subtitle',
      margin: [0, 0, 0, 16]
    },
    { text: 'Totaux', style: 'sectionTitle' },
    toPdfTable(
      ["Type d'acte", 'Total'],
      (Object.keys(ACT_LABELS) as (keyof typeof ACT_LABELS)[]).map((key) => [
        ACT_LABELS[key],
        data.totals[key]
      ])
    ),
    { text: 'Par mois', style: 'sectionTitle' },
    toPdfTable(
      ['Mois', 'Naissances', 'Décès', 'Mariages', 'Divorces'],
      data.byMonth.map((row) => [
        row.month,
        row.naissances,
        row.deces,
        row.mariages,
        row.divorces
      ])
    ),
    { text: 'Par sexe', style: 'sectionTitle' },
    toPdfTable(
      ["Type d'acte", 'Masculin', 'Féminin'],
      [
        [
          'Naissances',
          data.bySex.naissances.masculin,
          data.bySex.naissances.feminin
        ],
        ['Décès', data.bySex.deces.masculin, data.bySex.deces.feminin]
      ]
    ),
    { text: 'Détail par modèle', style: 'sectionTitle' },
    toPdfTable(['Indicateur', 'Valeur'], detailedIndicatorRows(data)),
    { text: 'Région / département / commune', style: 'sectionTitle' },
    toPdfTable(
      [
        'Région',
        'Département',
        'Commune',
        'Naissances',
        'Décès',
        'Mariages',
        'Divorces'
      ],
      data.byLocation.map((row) => [
        row.region ?? '',
        row.departement ?? '',
        row.commune,
        row.naissances,
        row.deces,
        row.mariages,
        row.divorces
      ])
    )
  ]

  const docDefinition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [32, 32, 32, 32],
    content,
    styles: {
      title: { fontSize: 18, bold: true, margin: [0, 0, 0, 4] },
      subtitle: { fontSize: 10, color: '#6B6B6B' },
      sectionTitle: { fontSize: 13, bold: true, margin: [0, 12, 0, 6] }
    },
    defaultStyle: { fontSize: 9 }
  }

  pdfMake
    .createPdf(docDefinition)
    .download(`statistiques-${todayForFilename()}.pdf`)
}
