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
import styled from 'styled-components'
import { InputError } from './InputError'
import { InputLabel } from './InputLabel'
import { InputDescriptor } from './InputDescriptor'

const InputHeader = styled.div``
const ComponentWrapper = styled.span``
const InputDescription = styled.p`
  ${({ theme }) => theme.fonts.reg16};
  color: ${({ theme }) => theme.colors.copy};
`

const LABEL_COLUMN_WIDTH = 200

// Niger : le libellé et le champ sont sur la même ligne (comme CityWeb),
// pas empilés l'un sur l'autre — gain de hauteur important sur des
// formulaires avec beaucoup de champs. Ne s'applique qu'aux champs
// "normaux" : les boîtes de section groupées (variant="highlighted")
// gardent leur bandeau de titre au-dessus, sur toute la largeur.
const DefaultInputWrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 4px 12px;

  ${InputHeader} {
    flex: 0 0 ${LABEL_COLUMN_WIDTH}px;
    max-width: ${LABEL_COLUMN_WIDTH}px;
    padding-top: 6px;
    overflow-wrap: break-word;
  }

  /* Niger : le champ ne s'étire plus jusqu'au bord de la carte — largeur
   * réduite d'environ un tiers, sans changer la taille de la carte
   * elle-même ni la largeur de la colonne de libellé. */
  ${ComponentWrapper} {
    flex: 1 1 200px;
    max-width: 66%;
    min-width: 0;
  }

  ${InputDescriptor}, ${InputError}, ${InputDescription} {
    flex-basis: 100%;
    margin-left: ${LABEL_COLUMN_WIDTH + 12}px;
  }
`
// Niger : encadré fin sur tout le pourtour, fond transparent (se fond dans
// le vert pâle du formulaire englobant, voir FormWizard.tsx) — calqué sur
// la page de déclaration d'INCI (capture fournie le 2026-08-18), qui
// entoure chaque groupe de champs d'un simple liseré plutôt qu'un accent
// de couleur à gauche.
const HighlightedInputWrapper = styled.div`
  border-radius: 6px;
  border: 1px solid #58b368;
  background: transparent;
  padding: 12px 14px 10px;
  margin-top: 16px;

  &:first-child {
    margin-top: 0;
  }

  /* InputHeader est un composant partagé par TOUS les champs, y compris
   * ceux imbriqués à l'intérieur du bloc (ComponentWrapper) : un sélecteur
   * "${InputHeader} label" (descendant, sans >) les ciblait donc aussi. Le
   * combinateur enfant direct (>) restreint la règle au seul InputHeader
   * du bloc lui-même, rendu comme enfant direct de ce wrapper. */
  > ${InputHeader} label {
    padding: 0 0 6px;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    color: #33795c;
    ${({ theme }) => theme.fonts.bold16};
  }

  ${InputDescriptor} {
    padding: 4px 0 0;
  }

  ${ComponentWrapper} {
    display: block;
  }

  ${InputError} {
    padding: 2px 0 0;
  }
`

export interface IInputFieldProps {
  id: string
  label?: string
  className?: string
  helperText?: string
  tooltip?: string
  description?: string
  required?: boolean
  disabled?: boolean
  maxLength?: number
  touched: boolean
  error?: string
  prefix?: string | JSX.Element
  postfix?: string | JSX.Element
  unit?: string | JSX.Element
  optionalLabel?: string
  children: React.ReactNode
  hideAsterisk?: boolean
  hideErrorLabel?: boolean
  hideInputHeader?: boolean
  htmlFor?: string
  variant?: 'default' | 'highlighted'
  /**
   * Niger : largeur maximale du champ, adaptée par type de champ (ex. une
   * date n'a pas besoin d'être aussi large qu'un champ texte libre). Passée
   * en style inline pour prendre le dessus sur le max-width par défaut de
   * ComponentWrapper, sans avoir à jongler avec la spécificité CSS.
   */
  maxWidth?: string
}

export const InputField = (props: IInputFieldProps) => {
  const {
    id,
    label,
    helperText,
    tooltip,
    required,
    description,
    error,
    touched,
    hideAsterisk,
    hideErrorLabel,
    hideInputHeader = false,
    prefix,
    htmlFor,
    variant,
    maxWidth
  } = props

  const postfix = props.postfix as React.ReactNode | string
  const unit = props.unit as React.ReactNode | string

  const isDomElement = (
    nodeType: string | React.JSXElementConstructor<any>
  ) => {
    return typeof nodeType === 'string'
  }

  const children = React.Children.map(props.children, (node) => {
    if (!React.isValidElement(node)) return node
    return isDomElement(node.type)
      ? node
      : React.cloneElement(
          node as React.ReactElement<Record<string, unknown>>,
          { prefix, postfix, unit }
        )
  })

  const InputWrapper =
    variant === 'highlighted' ? HighlightedInputWrapper : DefaultInputWrapper

  return (
    <InputWrapper id={`${id}-form-input`} className={props.className}>
      {!hideInputHeader && (
        <InputHeader>
          {label && (
            <InputLabel
              id={`${id}_label`}
              inputDescriptor={helperText}
              disabled={props.disabled}
              required={required}
              // Since input label does not actually wrap the input, we need to reference it.
              // However, we cannot do it for all FieldTypes since not all of them are actual inputs.
              htmlFor={htmlFor}
              hideAsterisk={hideAsterisk}
              tooltip={tooltip}
              variant={variant}
            >
              {label}
            </InputLabel>
          )}
        </InputHeader>
      )}

      {!hideInputHeader && label && helperText && (
        <InputDescriptor>{helperText}</InputDescriptor>
      )}

      <ComponentWrapper style={maxWidth ? { maxWidth } : undefined}>
        {children}
      </ComponentWrapper>

      {error && touched && !hideErrorLabel && (
        <InputError id={props.id + '_error'}>{error}</InputError>
      )}

      {description && <InputDescription>{description}</InputDescription>}
    </InputWrapper>
  )
}
