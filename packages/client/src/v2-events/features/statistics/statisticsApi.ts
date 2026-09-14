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
import { ensureFreshAccessToken, getToken } from '@client/utils/authUtils'

/**
 * Niger : page "Statistiques" native (remplace le tableau de bord Metabase)
 * — API dédiée hébergée par countryconfig, même passthrough nginx que
 * `registersApi.ts` (`/api/countryconfig/...`).
 */
const STATISTICS_BASE = '/api/countryconfig/statistics'

export type ActType = 'naissances' | 'deces' | 'mariages' | 'divorces'

export interface StatisticsFilters {
  startDate?: string
  endDate?: string
  regionId?: string
  departmentId?: string
  communeId?: string
}

// Niger : pas de valeur "inconnu" — le champ sexe est obligatoire dans les
// formulaires de naissance/décès, toujours masculin ou féminin.
export interface SexBreakdown {
  masculin: number
  feminin: number
}

export interface MonthRow extends Record<ActType, number> {
  month: string
}

export interface LocationRow extends Record<ActType, number> {
  region: string | null
  departement: string | null
  commune: string
}

export interface SexBreakdownWithTotal extends SexBreakdown {
  total: number
}

/**
 * Niger : détail par modèle (transcription/jugement déclaratif), demandé
 * pour le tableau de bord statistique — voir `tableau_de_bord.pdf` fourni
 * par l'utilisateur le 2026-09-14.
 */
export interface DetailedStatistics {
  naissances: {
    transcriptions: SexBreakdownWithTotal
    jugements: SexBreakdownWithTotal
  }
  deces: {
    transcriptions: SexBreakdownWithTotal
    jugements: SexBreakdownWithTotal
  }
  mariages: { transcriptions: number; jugements: number }
  divorces: {
    transcriptionsDivorce: number
    transcriptionsRepudiation: number
    jugementsDivorce: number
    jugementsRepudiation: number
  }
}

export interface CirconstanceNaissance {
  domicile: number
  formationSanitaire: number
  inconnu: number
}

export interface AgeBracketRow {
  bracket: string
  total: number
}

/**
 * Niger : "GEN - Nombre d'acte par modèle" — contrairement à `detailed`
 * ci-dessus (qui exclut les copies conformes comme le reste du tableau de
 * bord), ce rapport distingue les 3 modèles existants pour chaque type
 * d'acte, copie conforme incluse.
 */
export interface ActModeleBreakdown {
  transcription: number
  jugement: number
  copieConforme: number
}

export interface ProfessionCount {
  occupation: string
  total: number
}

export interface StatisticsResponse {
  /**
   * Niger : totaux nationaux (toujours sans restriction de commune, y
   * compris pour un agent local) — voir `restrictedToOwnOffices` pour
   * savoir si `totals`/`bySex`/`byMonth`/`byLocation` ci-dessous sont
   * limités à ses propres bureaux.
   */
  nationalTotals: Record<ActType, number>
  restrictedToOwnOffices: boolean
  totals: Record<ActType, number>
  bySex: { naissances: SexBreakdown; deces: SexBreakdown }
  detailed: DetailedStatistics
  circonstanceNaissance: CirconstanceNaissance
  decesByAgeBracket: AgeBracketRow[]
  parModele: Record<ActType, ActModeleBreakdown>
  categoriesProfessionnelles: { pere: ProfessionCount[]; mere: ProfessionCount[] }
  byMonth: MonthRow[]
  byLocation: LocationRow[]
}

export interface AdministrativeAreaOption {
  id: string
  name: string
}

export interface StatisticsLocations {
  regions: AdministrativeAreaOption[]
  departments: (AdministrativeAreaOption & { regionId: string })[]
  communes: (AdministrativeAreaOption & { departmentId: string })[]
}

async function authorizedFetch(url: string, init?: RequestInit) {
  await ensureFreshAccessToken()
  return fetch(url, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${getToken()}`
    }
  })
}

function buildQueryString(filters: StatisticsFilters): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value) {
      params.set(key, value)
    }
  }
  const query = params.toString()
  return query ? `?${query}` : ''
}

export async function fetchStatistics(
  filters: StatisticsFilters
): Promise<StatisticsResponse> {
  const res = await authorizedFetch(
    `${STATISTICS_BASE}${buildQueryString(filters)}`
  )
  if (!res.ok) {
    throw new Error('Failed to load statistics.')
  }
  return res.json() as Promise<StatisticsResponse>
}

export async function fetchStatisticsLocations(): Promise<StatisticsLocations> {
  const res = await authorizedFetch(`${STATISTICS_BASE}/locations`)
  if (!res.ok) {
    throw new Error('Failed to load statistics locations.')
  }
  return res.json() as Promise<StatisticsLocations>
}
