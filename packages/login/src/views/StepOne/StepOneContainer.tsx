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

import {
  getErrorCode,
  getSubmissionError,
  getsubmitting,
  selectApplicationName
} from '@login/login/selectors'
import { useDispatch, useSelector } from 'react-redux'
import { useIntl } from 'react-intl'
import { Field, Form } from 'react-final-form'
import { InputField, PasswordInput, TextInput } from '@opencrvs/components'
import { messages } from '@login/i18n/messages/views/stepOneForm'
import { stepOneFields } from '@login/views/StepOne/stepOneFields'
import {
  ERROR_CODE_FIELD_MISSING,
  ERROR_CODE_FORBIDDEN_CREDENTIALS,
  ERROR_CODE_INVALID_CREDENTIALS,
  ERROR_CODE_PHONE_NUMBER_VALIDATE
} from '@login/utils/authUtils'
import { IAuthenticationData } from '@login/utils/authApi'
import * as actions from '@login/login/actions'
import { resetSubmissionError } from '@login/login/actions'
import { Toast } from '@opencrvs/components/lib/Toast/Toast'
import {
  CompactContainer,
  FormWrapper,
  LoginCard,
  CardHeaderRow,
  CardTitle,
  GreenButton
} from '@login/views/Common'
import { PowerIcon } from '@login/common/icons/PowerIcon'
import { Stack } from '@opencrvs/components/lib/Stack/Stack'
import { useNavigate } from 'react-router-dom'
import { STEP_TWO, STEP_THREE } from '@login/navigation/routes'

const userNameField = stepOneFields.username
const passwordField = stepOneFields.password

const UserNameInput = () => {
  const intl = useIntl()

  return (
    <Field name={userNameField.name}>
      {({ meta, input, ...otherProps }) => (
        <InputField
          {...userNameField}
          {...otherProps}
          touched={Boolean(meta.touched)}
          label={intl.formatMessage(userNameField.label)}
          optionalLabel={intl.formatMessage(messages.optionalLabel)}
        >
          <TextInput
            {...userNameField}
            {...input}
            touched={Boolean(meta.touched)}
            error={Boolean(meta.error)}
            type="text"
          />
        </InputField>
      )}
    </Field>
  )
}

const Password = () => {
  const intl = useIntl()

  return (
    <Field name={passwordField.name}>
      {({ meta, input, ...otherProps }) => (
        <InputField
          {...passwordField}
          {...otherProps}
          touched={Boolean(meta.touched)}
          label={intl.formatMessage(passwordField.label)}
          optionalLabel={intl.formatMessage(messages.optionalLabel)}
        >
          <PasswordInput
            {...passwordField}
            {...input}
            touched={Boolean(meta.touched)}
            error={Boolean(meta.error)}
          />
        </InputField>
      )}
    </Field>
  )
}

const FORM_NAME = 'STEP_ONE'

export function StepOneContainer() {
  const submitting = useSelector(getsubmitting)
  const errorCode = useSelector(getErrorCode)
  const submissionError = useSelector(getSubmissionError)
  const intl = useIntl()
  const isOffline: boolean = navigator.onLine ? false : true

  const navigate = useNavigate()

  const toStepTwo = () => navigate(STEP_TWO)
  const toStepThree = () => navigate(STEP_THREE)

  const dispatch = useDispatch()

  const appName = useSelector(selectApplicationName)

  React.useEffect(() => {
    if (appName) document.title = appName
  }, [appName])
  return (
    <CompactContainer id="login-step-one-box">
      <LoginCard id="Box">
        <CardHeaderRow>
          <CardTitle>{intl.formatMessage(messages.stepOneLoginText)}</CardTitle>
          <PowerIcon />
        </CardHeaderRow>
        <Form
          onSubmit={(values: IAuthenticationData) =>
            dispatch(actions.authenticate(values, toStepTwo, toStepThree))
          }
        >
          {({ handleSubmit }) => (
            <FormWrapper id={FORM_NAME} onSubmit={handleSubmit}>
              <Stack direction="column" alignItems="stretch" gap={6}>
                <Field name={userNameField.name} component={UserNameInput} />

                <Field name={passwordField.name} component={Password} />
                <Stack direction="row" justifyContent="flex-end" gap={6}>
                  <GreenButton
                    id="login-mobile-submit"
                    type="primary"
                    size="medium"
                    loading={submitting}
                  >
                    {intl.formatMessage(messages.submit)}
                  </GreenButton>
                </Stack>
              </Stack>
            </FormWrapper>
          )}
        </Form>
      </LoginCard>

      {submissionError && errorCode ? (
        <Toast type="error" onClose={() => dispatch(resetSubmissionError())}>
          {errorCode === ERROR_CODE_FIELD_MISSING &&
            intl.formatMessage(messages.fieldMissing)}
          {errorCode === ERROR_CODE_INVALID_CREDENTIALS &&
            intl.formatMessage(messages.submissionError)}
          {errorCode === ERROR_CODE_FORBIDDEN_CREDENTIALS &&
            intl.formatMessage(messages.forbiddenCredentialError)}
          {errorCode === ERROR_CODE_PHONE_NUMBER_VALIDATE &&
            intl.formatMessage(messages.phoneNumberFormat)}
        </Toast>
      ) : (
        isOffline && (
          <Toast type="error">
            {intl.formatMessage(messages.networkError)}
          </Toast>
        )
      )}
    </CompactContainer>
  )
}
