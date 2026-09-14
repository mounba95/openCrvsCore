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
import styled from 'styled-components'
import { ITextInputProps, TextInput } from '../TextInput/TextInput'
import { InputLabel } from '../InputField/InputLabel'

const DateWrapper = styled.div`
  width: 100%;
`
export const NoticeWrapper = styled.div`
  padding-bottom: 16px;
`
type IProps = {
  id: string
  disabled?: boolean
  meta?: { touched: boolean; error: string }
  focusInput?: boolean
  notice?: string
  ignorePlaceHolder?: boolean
  onChange: (dateString: string) => void
  /**
   * Test id for the component.
   */
  'data-testid'?: string
}

export type IDateFieldProps = IProps & Omit<ITextInputProps, 'onChange'>

/**
 * Niger : un unique champ date (calendrier natif du navigateur) plutôt que
 * les 3 cases jj/mm/aaaa alignées séparément — même contrat de valeur
 * (chaîne ISO yyyy-MM-dd) que l'ancienne implémentation, donc aucun
 * changement nécessaire côté validators/config des événements.
 */
export const DateField = ({
  id,
  disabled,
  meta,
  focusInput,
  notice,
  value: initialValue,
  onChange,
  ...props
}: IDateFieldProps) => {
  return (
    <>
      <DateWrapper id={id}>
        {notice && (
          <NoticeWrapper>
            <InputLabel id={`${id}_notice`}>{notice}</InputLabel>
          </NoticeWrapper>
        )}
        <TextInput
          {...props}
          data-testid={props['data-testid']}
          id={id}
          type="date"
          autoFocus={focusInput}
          error={Boolean(meta && meta.error)}
          isDisabled={disabled}
          touched={meta && meta.touched}
          value={typeof initialValue === 'string' ? initialValue : ''}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            onChange(event.target.value)
          }
        />
      </DateWrapper>
    </>
  )
}
