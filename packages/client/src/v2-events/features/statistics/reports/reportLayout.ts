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
import type { Content, StyleDictionary } from 'pdfmake/interfaces'

/**
 * Niger, 2026-09-14 : mise en page/style partagés entre les rapports du
 * catalogue "États statistiques" (voir StatisticsReportsPage.tsx) — bandeau
 * vert de marque, styles de table communs — pour que chaque nouveau rapport
 * n'ait qu'à fournir son contenu, pas sa présentation.
 */
export const BRAND_GREEN = '#52AF62'
export const BRAND_GREEN_DARK = '#2E6B39'

export interface ReportPeriod {
  startYear: number
  endYear: number
  label: string
}

export function buildReportPeriod(
  startYear: number,
  endYear: number
): ReportPeriod {
  return {
    startYear,
    endYear,
    label: `Période : du 01/01/${startYear} au 31/12/${endYear}`
  }
}

export interface ReportGeographicLabels {
  label: string
}

/**
 * Niger : reprend la même hiérarchie commune > département > région >
 * national que `formatFilterSummary` dans `export.ts`, pour que le libellé
 * affiché sur le rapport corresponde toujours au filtre réellement
 * appliqué à la requête (le plus précis des trois, jamais une combinaison).
 */
export function buildGeographicLabel(labels: {
  region?: string
  departement?: string
  commune?: string
}): ReportGeographicLabels {
  if (labels.commune) {
    return { label: `Zone : Commune de ${labels.commune}` }
  }
  if (labels.departement) {
    return { label: `Zone : Département de ${labels.departement}` }
  }
  if (labels.region) {
    return { label: `Zone : Région de ${labels.region}` }
  }
  return { label: 'Zone : National' }
}

export function reportBanner(title: string, subtitle: string): Content {
  return {
    table: {
      widths: ['*'],
      body: [
        [
          {
            stack: [
              { text: title, style: 'bannerTitle' },
              { text: subtitle, style: 'bannerSubtitle' }
            ],
            fillColor: BRAND_GREEN,
            margin: [12, 10, 12, 10]
          }
        ]
      ]
    },
    layout: 'noBorders',
    margin: [0, 0, 0, 4]
  }
}

export const reportStyles: StyleDictionary = {
  bannerTitle: { fontSize: 13, bold: true, color: 'white' },
  bannerSubtitle: {
    fontSize: 10,
    italics: true,
    color: 'white',
    margin: [0, 2, 0, 0]
  },
  period: { fontSize: 10, color: BRAND_GREEN_DARK, bold: true },
  generatedAt: { fontSize: 8, color: '#6B6B6B' },
  sectionTitle: {
    fontSize: 12,
    bold: true,
    color: BRAND_GREEN_DARK,
    margin: [0, 12, 0, 6]
  },
  tableHeader: { fontSize: 9, bold: true, fillColor: '#EFFAF5' },
  indicatorLabel: { fontSize: 9, margin: [0, 4, 0, 4] },
  indicatorValue: {
    fontSize: 10,
    bold: true,
    alignment: 'right',
    margin: [0, 4, 0, 4]
  },
  indicatorLabelBold: {
    fontSize: 9,
    bold: true,
    margin: [0, 4, 0, 4]
  },
  indicatorValueBold: {
    fontSize: 10,
    bold: true,
    color: BRAND_GREEN_DARK,
    alignment: 'right',
    margin: [0, 4, 0, 4]
  },
  footnote: { fontSize: 7, italics: true, color: '#6B6B6B' }
}
