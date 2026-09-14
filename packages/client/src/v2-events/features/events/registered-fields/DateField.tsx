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

import format from 'date-fns/format'
import * as React from 'react'
import { defineMessages, useIntl } from 'react-intl'
import {
  DateField as DateFieldType,
  DatetimeValue,
  PlainDate,
  plainDateToLocalDate
} from '@opencrvs/commons/client'
import {
  DateField as DateFieldComponent,
  IDateFieldProps as DateFieldProps
} from '@opencrvs/components/lib/DateField'
import { StringifierContext } from './RegisteredField'

const messages = defineMessages({
  dateFormat: {
    defaultMessage: 'd MMMM y',
    id: 'configuration.dateFormat',
    description: 'Default format for date values'
  }
})

function DateInput({
  onChange,
  value = '',
  ...props
}: DateFieldProps & {
  onChange: (newValue: string | undefined) => void
  value: string
}) {
  return (
    <DateFieldComponent
      {...props}
      data-testid={`${props.id}`}
      value={value}
      onChange={(val) => onChange(val || undefined)}
    />
  )
}

function DateOutput({ value }: { value?: string }) {
  const intl = useIntl()
  const parsed = PlainDate.safeParse(value)

  if (parsed.success) {
    return format(
      plainDateToLocalDate(parsed.data),
      intl.formatMessage(messages.dateFormat)
    )
  }

  return String(value ?? '')
}

function stringify(
  value: string | undefined,
  context: StringifierContext<DateFieldType>
) {
  const parsedDate = PlainDate.safeParse(value)
  if (parsedDate.success) {
    return format(
      plainDateToLocalDate(parsedDate.data),
      context.intl.formatMessage(messages.dateFormat)
    )
  }

  // DatetimeValue includes explicit timezone info, so new Date() is safe here.
  const parsedDatetime = DatetimeValue.safeParse(value)
  if (parsedDatetime.success) {
    return format(
      new Date(parsedDatetime.data),
      context.intl.formatMessage(messages.dateFormat)
    )
  }

  return String(value ?? '')
}

export const DateField = {
  Input: DateInput,
  Output: DateOutput,
  stringify,
  toCertificateVariables: stringify
}
