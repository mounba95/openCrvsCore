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

const ACT_TYPE_LABELS: Record<keyof StatisticsResponse['parModele'], string> = {
  naissances: 'Naissances',
  deces: 'Décès',
  mariages: 'Mariages',
  divorces: 'Divorces / Répudiation'
}

/**
 * Niger, 2026-09-14 : "GEN - Nombre d'acte par modèle" — voir
 * `parModele` calculé côté serveur (`api/statistics/handler.ts`), qui
 * distingue transcription/jugement/copie conforme pour chaque type d'acte
 * (contrairement au reste du tableau de bord, qui exclut les copies
 * conformes).
 */
export function generateActByModeleReportPdf(
  data: StatisticsResponse,
  period: ReportPeriod,
  geography: ReportGeographicLabels
) {
  const rows = (
    Object.keys(ACT_TYPE_LABELS) as (keyof StatisticsResponse['parModele'])[]
  ).map((actType) => {
    const breakdown = data.parModele[actType]
    const total =
      breakdown.transcription + breakdown.jugement + breakdown.copieConforme
    return { actType, breakdown, total }
  })
  const grandTotal = rows.reduce((sum, row) => sum + row.total, 0)

  const content: Content[] = [
    reportBanner(
      "État Statistique : Nombre d'acte par modèle",
      "GEN - Nombre d'acte par modèle"
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
        widths: ['*', 90, 80, 90, 70],
        body: [
          [
            { text: "Type d'acte", style: 'tableHeader' },
            { text: 'Transcription', style: 'tableHeader' },
            { text: 'Jugement', style: 'tableHeader' },
            { text: 'Copie conforme', style: 'tableHeader' },
            { text: 'Total', style: 'tableHeader' }
          ],
          ...rows.map(({ actType, breakdown, total }) => [
            { text: ACT_TYPE_LABELS[actType], style: 'indicatorLabel' },
            {
              text: breakdown.transcription.toLocaleString('fr-FR'),
              style: 'indicatorValue'
            },
            {
              text: breakdown.jugement.toLocaleString('fr-FR'),
              style: 'indicatorValue'
            },
            {
              text: breakdown.copieConforme.toLocaleString('fr-FR'),
              style: 'indicatorValue'
            },
            { text: total.toLocaleString('fr-FR'), style: 'indicatorValueBold' }
          ]),
          [
            { text: 'Total', style: 'indicatorLabelBold' },
            {
              text: rows
                .reduce((sum, row) => sum + row.breakdown.transcription, 0)
                .toLocaleString('fr-FR'),
              style: 'indicatorValueBold'
            },
            {
              text: rows
                .reduce((sum, row) => sum + row.breakdown.jugement, 0)
                .toLocaleString('fr-FR'),
              style: 'indicatorValueBold'
            },
            {
              text: rows
                .reduce((sum, row) => sum + row.breakdown.copieConforme, 0)
                .toLocaleString('fr-FR'),
              style: 'indicatorValueBold'
            },
            {
              text: grandTotal.toLocaleString('fr-FR'),
              style: 'indicatorValueBold'
            }
          ]
        ]
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0,
        hLineColor: () => '#D9D9D9'
      }
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
      `etat-statistique-acte-par-modele-${period.startYear}-${period.endYear}.pdf`
    )
}
