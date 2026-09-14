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

/**
 * Niger, 2026-09-14 : rapport "État Statistique" générable à la demande —
 * voir StatisticsReportsPage.tsx (catalogue calqué sur "Liste des états
 * statistiques disponibles" d'INCI) et `tableau_de_bord.pdf` fourni par
 * l'utilisateur pour la liste des indicateurs. Contrairement à
 * `export.ts` (export brut de ce qui est affiché sur la page
 * "Statistiques"), ce document est une mise en page dédiée, pensée pour
 * être imprimée/partagée telle quelle.
 */
function sectionTable(rows: [string, number][]): Content {
  return {
    table: {
      widths: ['*', 80],
      body: rows.map(([label, value]) => [
        { text: label, style: 'indicatorLabel' },
        { text: value.toLocaleString('fr-FR'), style: 'indicatorValue' }
      ])
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0,
      hLineColor: () => '#D9D9D9'
    },
    margin: [0, 0, 0, 16]
  }
}

export function generateDemographicReportPdf(
  data: StatisticsResponse,
  period: ReportPeriod,
  geography: ReportGeographicLabels
) {
  const { detailed, circonstanceNaissance } = data

  const content: Content[] = [
    reportBanner(
      "État Statistique : Suivi de la démographie de l'état civil",
      "GEN - Suivi de la démographie de l'état civil"
    ),
    { text: period.label, style: 'period' },
    { text: geography.label, style: 'period' },
    {
      text: `Généré le ${new Date().toLocaleDateString('fr-FR')}`,
      style: 'generatedAt',
      margin: [0, 0, 0, 20]
    },

    { text: '1. Naissances', style: 'sectionTitle' },
    sectionTable([
      [
        'Nombre de transcriptions de naissance féminin',
        detailed.naissances.transcriptions.feminin
      ],
      [
        'Nombre de transcriptions de naissance masculin',
        detailed.naissances.transcriptions.masculin
      ],
      [
        'Nombre de transcriptions de jugements déclaratifs de naissance féminin',
        detailed.naissances.jugements.feminin
      ],
      [
        'Nombre de transcriptions de jugements déclaratifs de naissance masculin',
        detailed.naissances.jugements.masculin
      ],
      [
        'Total des transcriptions de naissance',
        detailed.naissances.transcriptions.total
      ]
    ]),

    { text: '2. Mariages', style: 'sectionTitle' },
    sectionTable([
      ['Nombre de transcriptions de mariage', detailed.mariages.transcriptions],
      ['Nombre de jugements déclaratifs de mariage', detailed.mariages.jugements]
    ]),

    { text: '3. Divorces / Répudiation', style: 'sectionTitle' },
    sectionTable([
      ['Nombre de transcriptions de divorce', detailed.divorces.transcriptionsDivorce],
      [
        'Nombre de transcriptions de répudiation',
        detailed.divorces.transcriptionsRepudiation
      ],
      ['Nombre de jugements déclaratifs de divorce', detailed.divorces.jugementsDivorce],
      [
        'Nombre de jugements déclaratifs de répudiation',
        detailed.divorces.jugementsRepudiation
      ],
      [
        'Total des jugements déclaratifs de divorce',
        detailed.divorces.jugementsDivorce
      ],
      [
        'Total des jugements déclaratifs de répudiation',
        detailed.divorces.jugementsRepudiation
      ]
    ]),

    { text: '4. Décès', style: 'sectionTitle' },
    sectionTable([
      [
        'Nombre de transcriptions de décès féminin',
        detailed.deces.transcriptions.feminin
      ],
      [
        'Nombre de transcriptions de décès masculin',
        detailed.deces.transcriptions.masculin
      ],
      [
        'Nombre de jugements déclaratifs de décès féminin',
        detailed.deces.jugements.feminin
      ],
      [
        'Nombre de jugements déclaratifs de décès masculin',
        detailed.deces.jugements.masculin
      ],
      ['Total des transcriptions de décès', detailed.deces.transcriptions.total]
    ]),

    { text: '5. Circonstance de naissance', style: 'sectionTitle' },
    sectionTable([
      ['Nombre de naissances survenues à domicile', circonstanceNaissance.domicile],
      [
        'Nombre de naissances survenues dans une formation sanitaire',
        circonstanceNaissance.formationSanitaire
      ]
    ])
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
      `etat-statistique-demographie-${period.startYear}-${period.endYear}.pdf`
    )
}
