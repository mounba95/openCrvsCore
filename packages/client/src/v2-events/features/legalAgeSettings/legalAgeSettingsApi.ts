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
 * Niger : seuils d'âge légaux (écart père/mère-enfant, âge minimum au
 * mariage), paramétrables par un administrateur — même idiome que
 * `declarationDeadlinesApi.ts`.
 */
const LEGAL_AGE_SETTINGS_BASE = '/api/countryconfig/legal-age-settings'

export interface LegalAgeSettings {
  parentChildMinAgeGap: number
  marriageMinAge: number
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

export async function fetchLegalAgeSettings(): Promise<LegalAgeSettings> {
  const res = await authorizedFetch(LEGAL_AGE_SETTINGS_BASE)
  if (!res.ok) {
    throw new Error('Failed to load legal age settings.')
  }
  return (await res.json()) as LegalAgeSettings
}

export async function updateLegalAgeSettings(input: LegalAgeSettings) {
  const res = await authorizedFetch(LEGAL_AGE_SETTINGS_BASE, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
  if (!res.ok) {
    throw new Error('Failed to update legal age settings.')
  }
}
