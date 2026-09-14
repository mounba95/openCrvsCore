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
import * as React from 'react'
import { useIntl } from 'react-intl'
import { useSelector } from 'react-redux'
import { Text } from '@opencrvs/components/lib/Text'
import { Select } from '@opencrvs/components/lib/Select'
import { Stack } from '@opencrvs/components/lib/Stack/Stack'
import { messages } from '@login/i18n/messages/views/stepThreeForm'
import {
  getRedirectToURL,
  getRefreshToken,
  getToken
} from '@login/login/selectors'
import { getLanguage } from '@login/i18n/selectors'
import { authApi } from '@login/utils/authApi'
import { CompactContainer, GreenButton, LoginCard } from '@login/views/Common'

/**
 * Niger : affichée uniquement quand l'utilisateur qui vient de s'authentifier
 * a plusieurs communes affectées (voir reducer.ts, VERIFY_CODE_COMPLETED).
 * Termine elle-même la redirection vers l'application, en ajoutant la commune
 * choisie en paramètre d'URL (`activeOfficeId`, lu par packages/client au
 * démarrage pour initialiser la commune active — voir profileReducer.ts).
 */
export function StepThreeContainer() {
  const intl = useIntl()
  const token = useSelector(getToken)
  const refreshToken = useSelector(getRefreshToken)
  const redirectToURL = useSelector(getRedirectToURL)
  const language = useSelector(getLanguage)

  const [offices, setOffices] = React.useState<
    { id: string; name: string }[]
  >([])
  const [selectedOfficeId, setSelectedOfficeId] = React.useState('')

  React.useEffect(() => {
    let cancelled = false
    authApi.getMyContext(token).then((context) => {
      if (cancelled) {
        return
      }
      setOffices(context.offices)
      setSelectedOfficeId(context.primaryOfficeId)
    })
    return () => {
      cancelled = true
    }
  }, [token])

  function continueToApp() {
    // Strip leading slash from redirectToURL to avoid double slash e.g. /register//events/...
    const path = redirectToURL
      ? `/register/${redirectToURL.replace(/^\//, '')}`
      : '/register'

    window.location.assign(
      `${path}?refreshToken=${refreshToken}&lang=${language}&activeOfficeId=${selectedOfficeId}`
    )
  }

  return (
    <CompactContainer id="login-step-three-box">
      <LoginCard id="Box">
        <Stack direction="column" alignItems="stretch" gap={12}>
          <Text element="h1" variant="h2" align="center">
            {intl.formatMessage(messages.stepThreeTitle)}
          </Text>
          <Text
            variant="reg16"
            align="center"
            color="supportingCopy"
            element="p"
          >
            {intl.formatMessage(messages.stepThreeInstruction)}
          </Text>
          <Select
            id="SelectActiveOffice"
            options={offices.map((office) => ({
              value: office.id,
              label: office.name
            }))}
            value={selectedOfficeId}
            placeholder=""
            onChange={(val: string) => setSelectedOfficeId(val)}
          />
          <GreenButton
            id="step-three-continue"
            type="primary"
            size="large"
            fullWidth
            disabled={!selectedOfficeId}
            onClick={continueToApp}
          >
            {intl.formatMessage(messages.continueButton)}
          </GreenButton>
        </Stack>
      </LoginCard>
    </CompactContainer>
  )
}
