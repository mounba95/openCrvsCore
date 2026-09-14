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
 * Niger : gestion des registres d'état civil (création/clôture annuelle par
 * commune) — API dédiée hébergée par countryconfig, appelée directement
 * depuis le navigateur via le passthrough nginx `/api/countryconfig/`, comme
 * `referenceApi.ts` le fait déjà pour `content/client`. Voir
 * CONTEXTE-PROJET.md §51.
 */
const REGISTERS_BASE = '/api/countryconfig/registers'

export type RegisterEventType = 'birth' | 'marriage' | 'death' | 'divorce'
export type RegisterStatus = 'OPEN' | 'CLOSED'

export interface Register {
  eventType: RegisterEventType
  year: number
  status: RegisterStatus
  lastNumber: number
  openedAt?: string
  openedBy?: string
  closedAt?: string
  closedBy?: string
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

export async function fetchRegisters(officeId: string): Promise<Register[]> {
  const res = await authorizedFetch(
    `${REGISTERS_BASE}?officeId=${encodeURIComponent(officeId)}`
  )
  if (!res.ok) {
    throw new Error('Failed to load registers.')
  }
  const body = (await res.json()) as { registers: Register[] }
  return body.registers
}

interface BaseRegisterInput {
  officeId: string
  eventType: RegisterEventType
  year: number
}

async function postRegisterAction<T extends BaseRegisterInput>(
  action: 'open' | 'close' | 'reopen' | 'delete' | 'reserve',
  input: T
) {
  const res = await authorizedFetch(`${REGISTERS_BASE}/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => undefined)) as
      | { reason?: string }
      | undefined
    throw new Error(body?.reason ?? `Failed to ${action} register.`)
  }
}

export const openRegister = (
  input: BaseRegisterInput & { initialNumber?: number }
) => postRegisterAction('open', input)

export const closeRegister = (input: BaseRegisterInput) =>
  postRegisterAction('close', input)

export const reopenRegister = (input: BaseRegisterInput) =>
  postRegisterAction('reopen', input)

export const deleteRegister = (input: BaseRegisterInput) =>
  postRegisterAction('delete', input)

/**
 * Réserve des numéros déjà attribués sur le registre papier avant/après
 * l'informatisation d'une commune — voir RegistersPage.tsx.
 */
export const reserveNumbers = (
  input: BaseRegisterInput & { upToNumber: number }
) => postRegisterAction('reserve', input)
