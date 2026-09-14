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
import { StatisticsResponse } from '../statisticsApi'
import { ReportGeographicLabels, ReportPeriod, reportBanner, reportStyles } from './reportLayout'

const vfs =
  (pdfFonts as unknown as { vfs?: Record<string, string> }).vfs ??
  (pdfFonts as unknown as { pdfMake?: { vfs: Record<string, string> } })
    .pdfMake?.vfs

if (vfs) {
  pdfMake.vfs = vfs
}

/**
 * Niger, 2026-09-14 : "DEC - Nombre de décès par tranche d'âge" — voir
 * StatisticsReportsPage.tsx et le champ `decesByAgeBracket` calculé côté
 * serveur (`api/statistics/handler.ts`, à partir de `deceased.dob` et
 * `eventDetails.date`).
 */
export function generateDeathByAgeReportPdf(
  data: StatisticsResponse,
  period: ReportPeriod,
  geography: ReportGeographicLabels
) {
  const total = data.decesByAgeBracket.reduce((sum, row) => sum + row.total, 0)

  const content: Content[] = [
    reportBanner(
      "État Statistique : Nombre de décès par tranche d'âge",
      "DEC - Nombre de décès par tranche d'âge"
    ),
    { text: period.label, style: 'period' },
    { text: geography.label, style: 'period' },
    {
      text: `Généré le ${new Date().toLocaleDateString('fr-FR')}`,
      style: 'generatedAt',
      margin: [0, 0, 0, 20]
    },
    {
      table: {
        widths: ['*', 80],
        body: [
          [
            { text: "Tranche d'âge", style: 'tableHeader' },
            { text: 'Nombre de décès', style: 'tableHeader' }
          ],
          ...data.decesByAgeBracket.map((row) => [
            { text: row.bracket, style: 'indicatorLabel' },
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
      }
    },
    {
      text: "Les actes sans date de naissance ou date de décès enregistrées ne sont pas inclus dans ce tableau.",
      style: 'footnote',
      margin: [0, 12, 0, 0]
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
    .download(`etat-statistique-deces-par-age-${period.startYear}-${period.endYear}.pdf`)
}
