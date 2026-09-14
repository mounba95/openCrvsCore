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
 * Niger : délais légaux de déclaration (60j / 6 mois en commune d'urgence /
 * 90j de viduité pour le divorce), paramétrables par un administrateur — API
 * dédiée hébergée par countryconfig, même idiome que `registersApi.ts`.
 */
const DEADLINES_BASE = '/api/countryconfig/declaration-deadlines'

export interface DeclarationDeadlineSettings {
  normalDays: number
  emergencyDays: number
  viduiteDays: number
  urgenceCommuneIds: string[]
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

export async function fetchDeclarationDeadlineSettings(): Promise<DeclarationDeadlineSettings> {
  const res = await authorizedFetch(DEADLINES_BASE)
  if (!res.ok) {
    throw new Error('Failed to load declaration deadline settings.')
  }
  return (await res.json()) as DeclarationDeadlineSettings
}

export async function updateDeclarationDeadlineSettings(input: {
  normalDays: number
  emergencyDays: number
  viduiteDays: number
}) {
  const res = await authorizedFetch(DEADLINES_BASE, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
  if (!res.ok) {
    throw new Error('Failed to update declaration deadline settings.')
  }
}

export async function updateCommuneUrgenceStatus(input: {
  locationId: string
  isUrgence: boolean
}) {
  const res = await authorizedFetch(`${DEADLINES_BASE}/communes`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
  if (!res.ok) {
    throw new Error('Failed to update commune urgence status.')
  }
}
