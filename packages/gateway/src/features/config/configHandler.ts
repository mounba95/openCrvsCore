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
import * as Hapi from '@hapi/hapi'
import { badData } from '@hapi/boom'
import * as Joi from 'joi'
import { pick } from 'lodash'
import { logger } from '@opencrvs/commons'
import { getAcceptedScopesFromToken } from '@opencrvs/commons/authentication'
import { COUNTRY_CONFIG_URL } from '@gateway/constants'
import fetch from '@gateway/fetch'

function getToken(request: Hapi.Request): string {
  const authorization = request.headers.authorization as string
  if (authorization.indexOf('Bearer') > -1) {
    return authorization.split(' ')[1]
  }
  return authorization
}

async function getCertificatesConfig(request: Hapi.Request) {
  const authToken = getToken(request)

  const printCertifiedCopiesScope = getAcceptedScopesFromToken(authToken, [
    'record.print-certified-copies'
  ])

  /**
   * Niger : un utilisateur qui ne peut pas imprimer de copie certifiée (ex.
   * l'Agent de Saisie, qui a `record.declare` mais pas
   * `record.print-certified-copies`) doit tout de même pouvoir VOIR l'aperçu
   * visuel du gabarit (Volet 1/Souche ou équivalent) pendant la saisie, à
   * titre purement informatif avant de déclarer — l'action d'impression
   * réelle reste gérée séparément par
   * `ACTION_SCOPE_MAP[PRINT_CERTIFICATE] = ['record.print-certified-copies']`
   * (voir opencrvs-core/packages/commons/src/events/scopes.ts), donc élargir
   * la simple VISIBILITÉ des gabarits ici n'accorde aucun droit d'impression
   * supplémentaire.
   */
  const declareScope = getAcceptedScopesFromToken(authToken, [
    'record.declare'
  ])

  if (printCertifiedCopiesScope.length === 0 && declareScope.length === 0) {
    return []
  }

  const url = new URL('/certificates', COUNTRY_CONFIG_URL).toString()
  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${authToken}` }
  })

  if (!res.ok) {
    throw new Error(
      `Failed to fetch certificates configuration: ${res.statusText} ${url}`
    )
  }

  const certificateConfigs = await res.json()

  if (printCertifiedCopiesScope.length === 0) {
    // Niger : aperçu seul, aucun droit d'impression — liste complète, non
    // filtrée (la restriction par gabarit n'a de sens que pour l'impression
    // réelle, voir plus bas).
    return certificateConfigs
  }

  const hasUnrestrictedScope = printCertifiedCopiesScope.some(
    (scope) => !scope.options?.templates?.length
  )
  if (hasUnrestrictedScope) {
    return certificateConfigs
  }

  const allowedTemplateIds = new Set(
    printCertifiedCopiesScope.flatMap((scope) => scope.options?.templates ?? [])
  )
  return certificateConfigs.filter((config: { id: string }) =>
    allowedTemplateIds.has(config.id)
  )
}

const searchCriteria = [
  'TRACKING_ID',
  'REGISTRATION_NUMBER',
  'NATIONAL_ID',
  'NAME',
  'PHONE_NUMBER',
  'EMAIL'
]

const applicationConfigResponseValidation = Joi.object({
  APPLICATION_NAME: Joi.string().required(),
  COUNTRY_LOGO: Joi.object()
    .keys({
      fileName: Joi.string().required(),
      file: Joi.string().required()
    })
    .required(),
  CURRENCY: Joi.object()
    .keys({
      isoCode: Joi.string().required(),
      languagesAndCountry: Joi.array().items(Joi.string()).required()
    })
    .required(),
  PHONE_NUMBER_PATTERN: Joi.string().required(),
  USER_NOTIFICATION_DELIVERY_METHOD: Joi.string().allow('').optional(),
  INFORMANT_NOTIFICATION_DELIVERY_METHOD: Joi.string().allow('').optional(),
  SEARCH_DEFAULT_CRITERIA: Joi.string()
    .valid(...searchCriteria)
    .optional()
    .default('TRACKING_ID')
})

async function getApplicationConfig() {
  const url = new URL('config/application', COUNTRY_CONFIG_URL).toString()
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Expected to get the application config from ${url}`)
  }

  const configFromCountryConfig = await res.json()
  const { error, value: validatedConfig } =
    applicationConfigResponseValidation.validate(configFromCountryConfig, {
      allowUnknown: true
    })
  if (error) {
    throw badData(error.details[0].message)
  }

  return validatedConfig
}

export async function configHandler(
  request: Hapi.Request,
  h: Hapi.ResponseToolkit
) {
  try {
    const [certificates, config] = await Promise.all([
      getCertificatesConfig(request),
      getApplicationConfig()
    ])
    return { config, certificates }
  } catch (ex) {
    logger.error(ex)
    if (process.env.NODE_ENV === 'development') {
      throw ex
    }
    return {}
  }
}

export async function publicConfigHandler(
  request: Hapi.Request,
  h: Hapi.ResponseToolkit
) {
  const config = pick(await getApplicationConfig(), [
    'APPLICATION_NAME',
    'COUNTRY_LOGO',
    'PHONE_NUMBER_PATTERN',
    'USER_NOTIFICATION_DELIVERY_METHOD',
    'INFORMANT_NOTIFICATION_DELIVERY_METHOD'
  ])
  return { config }
}
