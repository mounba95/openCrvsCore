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
import { default as ReactSelect, components } from 'react-select'
import styled, { createGlobalStyle } from 'styled-components'
import { Props } from 'react-select/lib/Select'
import { Icon } from '../Icon'

import { IndicatorProps } from 'react-select/lib/components/indicators'

export interface ISelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface IStyledSelectProps extends Props<ISelectOption> {
  id: string
  error?: boolean
  touched?: boolean
  options: ISelectOption[]
  placeholder?: string
}

const DropdownIndicator = (props: IndicatorProps<ISelectOption>) => {
  return (
    components.DropdownIndicator && (
      <components.DropdownIndicator {...props}>
        <Icon name="CaretDown" size="small" color="grey600" />
      </components.DropdownIndicator>
    )
  )
}

const StyledSelect = styled(ReactSelect)<IStyledSelectProps>`
  width: 100%;
  ${({ theme }) => theme.fonts.reg14};
  background: ${({ theme }) => theme.colors.white};
  color: ${({ theme }) => theme.colors.grey600};
  border-radius: 4px;
  &:hover {
    box-shadow: 0 0 0 4px ${({ theme }) => theme.colors.grey200};
  }

  .react-select__control {
    height: 30px;
    min-height: 30px;
    display: flex;
    align-items: center;
    cursor: pointer;
    border: 1.5px solid
      ${({ error, touched, disabled, theme }) =>
        error && touched
          ? theme.colors.negative
          : disabled
            ? theme.colors.grey300
            : theme.colors.copy};
    &:hover {
      border: 1.5px solid
        ${({ error, touched, disabled, theme }) =>
          error && touched
            ? theme.colors.negative
            : disabled
              ? theme.colors.grey300
              : theme.colors.copy};
      outline: 0.5px solid
        ${({ error, touched, disabled, theme }) =>
          error && touched
            ? theme.colors.negative
            : disabled
              ? theme.colors.grey300
              : theme.colors.copy};
    }
    &:focus {
      outline: 0.5px solid ${({ theme }) => theme.colors.grey600};
      border: 1.5px solid ${({ theme }) => theme.colors.grey600};
      color: ${({ theme }) => theme.colors.grey600};
    }
  }

  .react-select__placeholder {
    color: ${({ theme }) => theme.colors.grey400};
  }

  .react-select__indicator-separator {
    display: none;
  }

  .react-select__control--is-focused {
    outline: 0.5px solid ${({ theme }) => theme.colors.grey600};
    border: 1.5px solid ${({ theme }) => theme.colors.grey600};
    box-shadow: 0 0 0 4px ${({ theme }) => theme.colors.yellow};
  }

  .react-select__control--is-active {
    box-shadow: 0 0 0 4px ${({ theme }) => theme.colors.yellow};
  }

  .react-select__control--is-disabled {
    background-color: ${({ theme }) => theme.colors.white};
  }

  .react-select__value-container {
    padding: 0 10px;
    display: flex;
    align-items: center;
    height: 100%;
  }

  .react-select__single-value,
  .react-select__placeholder {
    overflow: visible;
    white-space: nowrap;
  }

  .react-select__option {
    cursor: pointer;
    border-radius: 4px;
    padding: 10px 16px;
    ${({ theme }) => theme.fonts.reg18};
    background-color: ${({ theme }) => theme.colors.white};
  }

  .react-select__option--is-focused {
    background-color: ${({ theme }) => theme.colors.grey50};
    color: ${({ theme }) => theme.colors.copy};
    &:active {
      background: ${({ theme }) => theme.colors.grey100};
      color: ${({ theme }) => theme.colors.copy};
    }
  }
  .react-select__option--is-selected {
    background-color: ${({ theme }) => theme.colors.grey200};
    color: ${({ theme }) => theme.colors.copy};
    &:active {
      background: ${({ theme }) => theme.colors.grey200};
      color: ${({ theme }) => theme.colors.copy};
    }
  }

  .react-select__single-value--is-disabled {
    color: ${({ theme }) => theme.colors.grey500};
  }

  .react-select__menu {
    z-index: 2;
    padding: 0px 4px;
  }
`

/**
 * Niger : le menu déroulant est désormais rendu via un portail attaché à
 * `document.body` (voir `menuPortalTarget` plus bas) pour ne plus être
 * masqué par une carte/conteneur voisin plus haut dans l'ordre d'empilement
 * (ex: la carte de connexion, ou tout formulaire avec `backdrop-filter`) —
 * bug observé sur le sélecteur de commune (connexion multi-communes,
 * création d'utilisateur, changement de commune). Comme le portail sort le
 * menu de l'arborescence stylée par ce composant, ses règles doivent être
 * globales pour continuer à s'appliquer.
 */
const GlobalReactSelectMenuStyle = createGlobalStyle`
  .react-select__menu-portal {
    z-index: 9999;
  }

  .react-select__menu {
    padding: 0px 4px;
  }

  .react-select__option {
    cursor: pointer;
    border-radius: 4px;
    padding: 10px 16px;
    ${({ theme }) => theme.fonts.reg18};
    background-color: ${({ theme }) => theme.colors.white};
  }

  .react-select__option--is-focused {
    background-color: ${({ theme }) => theme.colors.grey50};
    color: ${({ theme }) => theme.colors.copy};
    &:active {
      background: ${({ theme }) => theme.colors.grey100};
      color: ${({ theme }) => theme.colors.copy};
    }
  }

  .react-select__option--is-selected {
    background-color: ${({ theme }) => theme.colors.grey200};
    color: ${({ theme }) => theme.colors.copy};
    &:active {
      background: ${({ theme }) => theme.colors.grey200};
      color: ${({ theme }) => theme.colors.copy};
    }
  }
`

function getSelectedOption(
  value: string,
  options: ISelectOption[]
): ISelectOption | null {
  const selectedOption = options.find((x: ISelectOption) => x.value === value)
  if (selectedOption) {
    return selectedOption
  }

  return null
}

export interface ISelectProps
  extends Omit<IStyledSelectProps, 'value' | 'onChange'> {
  onChange: (value: string) => void
  value: string
  searchableLength?: number
  noOptionsMessage?: (obj: { inputValue: string }) => string | null
}

type ControlProps = React.ComponentProps<typeof components.Control>

function CustomControl(props: ControlProps) {
  const { innerProps, selectProps } = props
  return (
    <components.Control
      {...props}
      innerProps={
        {
          ...innerProps,
          'data-testid': selectProps['data-testid']
        } as ControlProps['innerProps'] & { 'data-testid': string }
      }
    />
  )
}

export const Select = (props: ISelectProps) => {
  const { searchableLength, onChange, disabled, options, value, error } = props

  const handleChange = (selectedOption: ISelectOption) => {
    if (onChange) {
      onChange(selectedOption.value)
    }
  }
  const length = searchableLength || 10

  return (
    <>
      <GlobalReactSelectMenuStyle />
      <StyledSelect
        classNamePrefix="react-select"
        components={{ DropdownIndicator, Control: CustomControl }}
        {...props}
        // Prevents premature Formik validation on mobile where react-select blurs the input synchronously before onChange settles
        blurInputOnSelect={false}
        onChange={handleChange}
        isDisabled={disabled}
        isSearchable={options.length > length}
        value={getSelectedOption(value, options)}
        error={error}
        // Niger : rendu du menu via portail (document.body) pour ne jamais
        // être masqué par une carte/conteneur voisin — voir
        // GlobalReactSelectMenuStyle ci-dessus. `styles.menuPortal` est
        // indispensable en plus de ce style global : react-select applique
        // son propre z-index en style INLINE sur le portail (z-index: 1 par
        // défaut), qui l'emporte toujours sur une règle CSS de classe même
        // avec un z-index plus élevé — sans ce `styles` prop, le menu sort
        // bien du conteneur (n'est plus rogné) mais reste visuellement
        // affiché DERRIÈRE toute boîte de dialogue (ex: "Changer de
        // commune"), ce qui ressemble à une liste masquée/coupée. Bug
        // signalé le 2026-08-09.
        menuPortalTarget={document.body}
        styles={{
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          menuPortal: (base: any) => ({ ...base, zIndex: 9999 })
        }}
        isOptionDisabled={({ value }: { value: string }) =>
          options.some(
            (option: ISelectOption) => option.value === value && option.disabled
          )
        }
      />
    </>
  )
}
