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
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces'
import pdfMake from 'pdfmake/build/pdfmake'
// eslint-disable-next-line @typescript-eslint/no-var-requires
import pdfFonts from 'pdfmake/build/vfs_fonts'
import { ProfessionCount, StatisticsResponse } from '../statisticsApi'
import {
  ReportGeographicLabels,
  ReportPeriod,
  reportBanner,
  reportStyles
} from './reportLayout'

const vfs =
  (pdfFonts as unknown as { vfs?: Record<string, string> }).vfs ??
  (pdfFonts as unknown as { pdfMake?: { vfs: Record<string, string> } })
    .pdfMake?.vfs

if (vfs) {
  pdfMake.vfs = vfs
}

function occupationTable(rows: ProfessionCount[]): Content {
  const total = rows.reduce((sum, row) => sum + row.total, 0)
  return {
    table: {
      widths: ['*', 80],
      body: [
        [
          { text: 'Profession déclarée', style: 'tableHeader' },
          { text: "Nombre d'actes", style: 'tableHeader' }
        ],
        ...rows.map((row) => [
          { text: row.occupation, style: 'indicatorLabel' },
          { text: row.total.toLocaleString('fr-FR'), style: 'indicatorValue' }
        ]),
        [
          { text: 'Total', style: 'indicatorLabelBold' },
          { text: total.toLocaleString('fr-FR'), style: 'indicatorValueBold' }
        ]
      ]
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0,
      hLineColor: () => '#D9D9D9'
    },
    margin: [0, 0, 0, 16]
  }
}

/**
 * Niger, 2026-09-14 : "NAI - Suivi des catégories professionnelles" — voir
 * `categoriesProfessionnelles` calculé côté serveur à partir de
 * `father.occupation`/`mother.occupation` (champs texte libre,
 * `analytics: true`, naissances uniquement).
 */
export function generateOccupationReportPdf(
  data: StatisticsResponse,
  period: ReportPeriod,
  geography: ReportGeographicLabels
) {
  const { pere, mere } = data.categoriesProfessionnelles

  const content: Content[] = [
    reportBanner(
      'État Statistique : Suivi des catégories professionnelles',
      'NAI - Suivi des catégories professionnelles'
    ),
    { text: period.label, style: 'period' },
    { text: geography.label, style: 'period' },
    {
      text: `Généré le ${new Date().toLocaleDateString('fr-FR')}`,
      style: 'generatedAt',
      margin: [0, 0, 0, 20]
    },
    { text: 'Profession du père', style: 'sectionTitle' },
    pere.length > 0
      ? occupationTable(pere)
      : { text: 'Aucune donnée.', style: 'indicatorLabel', margin: [0, 0, 0, 16] },
    { text: 'Profession de la mère', style: 'sectionTitle' },
    mere.length > 0
      ? occupationTable(mere)
      : { text: 'Aucune donnée.', style: 'indicatorLabel', margin: [0, 0, 0, 16] },
    {
      text: 'Les actes sans profession renseignée (champ facultatif) ne sont pas comptabilisés dans ce tableau.',
      style: 'footnote',
      margin: [0, 4, 0, 0]
    }
  ]

  const docDefinition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [32, 32, 32, 40],
    content,
    styles: reportStyles,
    defaultStyle: { fontSize: 9 },
    footer: (currentPage, pageCount) => ({
      text: `Page ${currentPage} / ${pageCount}`,
      alignment: 'center',
      fontSize: 8,
      color: '#6B6B6B',
      margin: [0, 8, 0, 0]
    })
  }

  pdfMake
    .createPdf(docDefinition)
    .download(
      `etat-statistique-categories-professionnelles-${period.startYear}-${period.endYear}.pdf`
    )
}
