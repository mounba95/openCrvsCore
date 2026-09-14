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

import { IncomingMessage } from 'http'
import { readFileSync } from 'fs'
import * as z from 'zod/v4'
import '@opencrvs/commons/monitoring'
import { TRPCError } from '@trpc/server'
import * as jwt from 'jsonwebtoken'
import {
  logger,
  REINDEX_USER_ID,
  TokenUserType,
  TokenWithBearer,
  SystemContext,
  UserContext,
  UUID
} from '@opencrvs/commons'
export { SystemContext, UserContext }
import { env } from './environment'
import { getUser } from './service/users/api'
import { isUserAssignedToOffice } from './storage/postgres/events/users'
import { getLocationById } from './service/locations/locations'

export const TrpcContext = z.object({
  token: TokenWithBearer,
  user: z.union([SystemContext, UserContext])
})
export type TrpcContext = z.infer<typeof TrpcContext>

/**
 * Service, internal or external caller. e.g. data-seeder, auth-service.
 */
export const ServiceTrpcContext = z.object({
  token: TokenWithBearer
})

export type ServiceTrpcContext = z.infer<typeof ServiceTrpcContext>

const tokenPublicKey = readFileSync(env.CERT_PUBLIC_KEY_PATH)

const TokenClaims = z.object({
  sub: z.string(),
  userType: TokenUserType,
  scope: z.array(z.string())
})
type TokenClaims = z.infer<typeof TokenClaims>

function verifyAppToken(token: TokenWithBearer): TokenClaims {
  const jwtToken = token.split(' ')[1]

  const verified = jwt.verify(jwtToken, tokenPublicKey, {
    algorithms: ['RS256'],
    issuer: 'opencrvs:auth-service',
    audience: ['opencrvs:gateway-user', 'opencrvs:events-user']
  })

  return TokenClaims.parse(verified)
}

type ServiceSubject = 'opencrvs:auth-service' | 'opencrvs:data-seeder-service'

function getServiceTokenVerifyOptions(
  subject: ServiceSubject
): jwt.VerifyOptions {
  return {
    subject,
    algorithms: ['RS256'],
    issuer: 'opencrvs:auth-service',
    audience: ['opencrvs:events-user']
  }
}

export function verifyInternalServiceToken(token: TokenWithBearer) {
  const tokenWithoutBearer = token.split(' ')[1]

  return jwt.verify(
    tokenWithoutBearer,
    tokenPublicKey,
    getServiceTokenVerifyOptions('opencrvs:auth-service')
  )
}

export function verifyInitialisationToken(token: TokenWithBearer) {
  const tokenWithoutBearer = token.split(' ')[1]

  return jwt.verify(
    tokenWithoutBearer,
    tokenPublicKey,
    getServiceTokenVerifyOptions('opencrvs:data-seeder-service')
  )
}

export type TrpcUserContext = SystemContext | UserContext

type HeadersLike =
  // gateway is not aware of Headers. We use this as a proxy.
  | {
      entries: () => IterableIterator<[string, string]>
    }
  | Headers

// This avoids TS2693 ("'Headers' only refers to a type, but is being used as a value here.") which is thrown by gateway in CI
function isHeadersLike(
  headers: HeadersLike | Record<string, string | string[] | undefined>
): headers is HeadersLike {
  return typeof headers === 'object' && typeof headers.entries === 'function'
}

function normalizeHeaders(
  headers: Headers | Record<string, string | string[] | undefined>
): Record<string, string | string[] | undefined> {
  if (isHeadersLike(headers)) {
    return Object.fromEntries(headers.entries())
  }

  return headers
}

/**
 * Niger : commune active choisie par l'utilisateur (bascule sans reconnexion,
 * en-tête X-Active-Office-Id), revalidée à chaque requête — voir CONTEXTE-PROJET.md.
 * Si absente ou invalide, on retombe sur primaryOfficeId (comportement inchangé).
 */
async function resolveUserDetails(
  token: TokenWithBearer,
  activeOfficeId?: UUID
): Promise<TrpcUserContext> {
  let userId: string
  let userType: TokenUserType

  try {
    const claims = verifyAppToken(token)
    userId = claims.sub
    userType = claims.userType
  } catch {
    logger.error('Error while parsing token')

    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }

  try {
    if (userId === REINDEX_USER_ID) {
      return SystemContext.parse({
        type: TokenUserType.enum.system,
        id: userId,
        primaryOfficeId: undefined
      })
    }

    if (userType === TokenUserType.enum.system) {
      return SystemContext.parse({
        type: userType,
        id: userId,
        primaryOfficeId: undefined
      })
    }

    const { primaryOfficeId, role, signature, administrativeAreaId } =
      await getUser(userId)

    if (activeOfficeId && activeOfficeId !== primaryOfficeId) {
      const isAssigned = await isUserAssignedToOffice(
        userId as UUID,
        activeOfficeId
      )

      if (!isAssigned) {
        // Un en-tête invalide/non affecté ne peut provenir que d'une falsification :
        // le client ne l'envoie que pour une commune qu'il a lui-même validée.
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      const office = await getLocationById(activeOfficeId)

      return UserContext.parse({
        type: userType,
        id: userId,
        primaryOfficeId: activeOfficeId,
        administrativeAreaId: office.administrativeAreaId,
        signature,
        role
      })
    }

    return UserContext.parse({
      type: userType,
      id: userId,
      primaryOfficeId,
      administrativeAreaId,
      signature,
      role
    })
  } catch (error) {
    if (error instanceof TRPCError) {
      throw error
    }

    logger.error(
      `Error retrieving user details for ${userType} ${userId}: ${error}}`
    )

    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })
  }
}

const ActiveOfficeHeader = UUID.optional()

export async function createContext({ req }: { req: IncomingMessage }) {
  const normalizedHeaders = normalizeHeaders(req.headers)
  const token = TokenWithBearer.safeParse(normalizedHeaders.authorization).data
  const activeOfficeId = ActiveOfficeHeader.safeParse(
    normalizedHeaders['x-active-office-id']
  ).data

  return {
    token,
    user:
      token &&
      (await resolveUserDetails(token, activeOfficeId).catch((error) => {
        if (error instanceof TRPCError && error.code === 'FORBIDDEN') {
          throw error
        }
        return undefined
      }))
  }
}

export function createServiceContext({ req }: { req: IncomingMessage }) {
  const normalizedHeaders = normalizeHeaders(req.headers)
  try {
    const token = TokenWithBearer.parse(normalizedHeaders.authorization)

    return {
      token
    }
  } catch {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
}
