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
import { JWT_ISSUER, WEB_USER_JWT_AUDIENCES } from '@auth/constants'
import { env } from '@auth/environment'
import {
  IAuthentication,
  authenticate,
  createToken,
  createRefreshToken,
  generateAndSendVerificationCode,
  getUserRoleScopeMapping,
  storeUserInformation
} from '@auth/features/authenticate/service'
import {
  NotificationEvent,
  generateNonce
} from '@auth/features/verifyCode/service'
import { forbidden, unauthorized } from '@hapi/boom'
import * as Hapi from '@hapi/hapi'
import * as Joi from 'joi'
import { maskEmail, maskSms } from '@opencrvs/commons'

interface IAuthPayload {
  username: string
  password: string
}

interface IAuthResponse {
  nonce: string
  mobile?: string
  email?: string
  status: string
  token?: string
  refreshToken?: string
}

export default async function authenticateHandler(
  request: Hapi.Request,
  h: Hapi.ResponseToolkit
): Promise<IAuthResponse> {
  const payload = request.payload as IAuthPayload
  let result: IAuthentication

  const { username, password } = payload
  try {
    result = await authenticate(username.trim(), password)
  } catch (err) {
    throw unauthorized()
  }
  if (result.status === 'deactivated') {
    throw forbidden()
  }

  const nonce = generateNonce()
  const response: IAuthResponse = {
    mobile: result.mobile && maskSms(result.mobile),
    email: result.email && maskEmail(result.email),
    status: result.status,
    nonce
  }

  const isPendingUser = response.status && response.status === 'pending'
  // Niger : la quasi-totalité des agents n'ont pas d'adresse email
  // personnelle (Gmail ou autre) pour recevoir un code de vérification, et
  // le SMS n'est pas non plus fiable partout — le code 2FA est donc
  // désactivé. Quand TWO_FA_ENABLED est à false
  // (déjà l'option existante, câblée dans l'infra dev/QA), on saute
  // directement à l'émission du token, comme pour un utilisateur "pending",
  // au lieu de stocker un nonce et d'envoyer un code à saisir.
  const skipTwoFA = isPendingUser || !env.TWO_FA_ENABLED

  const roleScopeMappings = await getUserRoleScopeMapping()

  const role = result.role as keyof typeof roleScopeMappings
  const scopes = roleScopeMappings[role]

  if (skipTwoFA) {
    response.token = await createToken(
      result.userId,
      scopes,
      WEB_USER_JWT_AUDIENCES,
      JWT_ISSUER,
      role
    )
    response.refreshToken = await createRefreshToken(result.userId)
  } else {
    await storeUserInformation(
      nonce,
      result.name,
      result.userId,
      scopes,
      result.mobile,
      result.email,
      role
    )

    const notificationEvent = NotificationEvent.TWO_FACTOR_AUTHENTICATION

    await generateAndSendVerificationCode(
      nonce,
      scopes,
      notificationEvent,
      result.name,
      result.mobile,
      result.email
    )
  }

  return response
}

export const requestSchema = Joi.object({
  username: Joi.string(),
  password: Joi.string()
})

export const responseSchema = Joi.object({
  nonce: Joi.string(),
  mobile: Joi.string().optional(),
  email: Joi.string().optional(),
  status: Joi.string(),
  role: Joi.string(),
  token: Joi.string().optional(),
  refreshToken: Joi.string().optional()
})

export type AuthenticateResponse = {
  nonce: string
  mobile?: string
  email?: string
  status: string
  token?: string
  refreshToken?: string
}
