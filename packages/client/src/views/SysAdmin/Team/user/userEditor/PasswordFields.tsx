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
import React from 'react'
import { useIntl } from 'react-intl'
import styled from 'styled-components'
import { InputField, TextInput } from '@opencrvs/components'
import { TickOff, TickOn } from '@opencrvs/components/lib/icons'
import { messages } from '@client/i18n/messages/views/userSetup'

const MIN_PASSWORD_LENGTH = 6

const ValidationRulesSection = styled.div`
  background: ${({ theme }) => theme.colors.background};
  margin: 16px 0 24px;
  padding: 8px 24px;
  & div {
    padding: 8px 0;
    display: flex;
    align-items: center;
    & span {
      margin-left: 8px;
    }
  }
`

const PasswordMismatch = styled.div`
  color: ${({ theme }) => theme.colors.negative};
  margin-top: 8px;
`

const PasswordMatch = styled.div`
  color: ${({ theme }) => theme.colors.positive};
  margin-top: 8px;
`

/**
 * Niger : 6 caractères minimum, sans autre contrainte (uniquement des
 * chiffres accepté) — voir UserPassword dans @opencrvs/commons.
 */
export function isPasswordValid(password: string, confirmPassword: string) {
  return (
    password.length >= MIN_PASSWORD_LENGTH && password === confirmPassword
  )
}

export function PasswordFields({
  password,
  confirmPassword,
  onChange,
  touched
}: {
  password: string
  confirmPassword: string
  onChange: (value: { password: string; confirmPassword: string }) => void
  touched: boolean
}) {
  const intl = useIntl()

  const validLength = password.length >= MIN_PASSWORD_LENGTH
  const mismatched =
    touched && confirmPassword.length > 0 && password !== confirmPassword
  const matched =
    confirmPassword.length > 0 && password === confirmPassword

  return (
    <div>
      <InputField
        id="newPassword"
        label={intl.formatMessage(messages.newPassword)}
        optionalLabel=""
        required={false}
        touched={touched}
      >
        <TextInput
          error={touched && password.length === 0}
          id="NewPassword"
          touched={touched}
          type="password"
          value={password}
          onChange={(e) =>
            onChange({ password: e.target.value, confirmPassword: '' })
          }
        />
      </InputField>
      <ValidationRulesSection>
        <div>
          {validLength ? <TickOn /> : <TickOff />}
          <span>
            {intl.formatMessage(messages.minLength, {
              min: MIN_PASSWORD_LENGTH
            })}
          </span>
        </div>
      </ValidationRulesSection>
      <InputField
        id="confirmPassword"
        label={intl.formatMessage(messages.confirmPassword)}
        optionalLabel=""
        required={false}
        touched={touched}
      >
        <TextInput
          error={mismatched}
          id="ConfirmPassword"
          touched={touched}
          type="password"
          value={confirmPassword}
          onChange={(e) =>
            onChange({ password, confirmPassword: e.target.value })
          }
        />
      </InputField>
      {mismatched && (
        <PasswordMismatch>
          {intl.formatMessage(messages.mismatch)}
        </PasswordMismatch>
      )}
      {matched && (
        <PasswordMatch>{intl.formatMessage(messages.match)}</PasswordMatch>
      )}
    </div>
  )
}
