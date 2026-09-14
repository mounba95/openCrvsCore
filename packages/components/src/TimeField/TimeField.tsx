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
import { ITextInputProps, TextInput } from '../TextInput/TextInput'
import { ISelectProps } from '../Select/Select'

export interface IProps {
  id: string
  disabled?: boolean
  meta?: { touched: boolean; error: string }
  focusInput?: boolean
  notice?: string
  value?: string
  ignorePlaceHolder?: boolean
  use12HourFormat?: boolean
  onChange: (dateString: string) => void
}

export type ITimeFieldProps = IProps &
  Omit<ITextInputProps, 'onChange' | 'value'> &
  Omit<ISelectProps, 'onChange' | 'value'>

/**
 * Niger : un unique champ heure (sélecteur natif du navigateur) plutôt que
 * les cases hh/mm (/AM-PM) séparées — même contrat de valeur (chaîne
 * "HH:mm" 24h) que l'ancienne implémentation. Voir la même logique
 * appliquée à DateField.
 */
export function TimeField({
  id,
  meta,
  focusInput,
  notice,
  disabled,
  value,
  onChange,
  ...otherProps
}: ITimeFieldProps) {
  return (
    <TextInput
      {...otherProps}
      id={id}
      type="time"
      autoFocus={focusInput}
      error={Boolean(meta && meta.error)}
      isDisabled={disabled}
      touched={meta && meta.touched}
      value={value ?? ''}
      onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
        onChange(event.target.value)
      }
    />
  )
}
