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
import React, { useRef } from 'react'
import styled from 'styled-components'
import { Text } from '../Text'
import { Button } from '../Button'
import { Icon } from '../Icon'

export interface IDialogProps {
  id?: string
  titleIcon?: React.ReactNode
  title: string
  isOpen?: boolean
  children?: React.ReactNode
  actions: JSX.Element[]
  onClose?: () => void
  /**
   * Width of the dialog in pixels (for large variant).
   */
  width?: number
  variant?: 'small' | 'large'
  /**
   * Niger : bandeau de titre coloré (fond vert, texte + icône de
   * fermeture blancs) au lieu du bandeau blanc par défaut — calqué sur la
   * modale de sélection de modèle d'INCI (capture fournie le 2026-08-18).
   */
  headerVariant?: 'default' | 'green'
}

const DialogWrapper = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  background-color: ${({ theme }) => theme.colors.opacity54};
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
`

const DialogContainer = styled.div<{
  variant?: 'small' | 'large'
  width?: number
}>`
  position: relative;
  ${({ variant, width }) =>
    variant === 'small'
      ? `
        width: 480px;
        max-width: 90%;
      `
      : `
        min-height: 118px;
        height: auto;
        width: ${width ? `${width}px` : '80%'};
            @media (max-width: 768px) and (orientation: portrait) {
             width: 100%;
             height: 100%;
             max-width: 100%;
             max-height: 100%;
             border-radius: 0;
             }
      `}
  background-color: ${({ theme }) => theme.colors.white};
  border-radius: 4px;
  box-shadow: ${({ theme }) => theme.shadows.heavy};
  display: flex;
  flex-direction: column;
  max-height: 80vh;
`
const DialogHeader = styled.div<{ $headerVariant?: 'default' | 'green' }>`
  display: flex;
  padding: 12px 32px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.grey200};
  justify-content: space-between;
  min-height: 40px;

  ${({ $headerVariant }) =>
    $headerVariant === 'green' &&
    `
      background: #3faa4e;
      border-bottom: none;
    `}
`
const DialogTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

const DialogContent = styled.div<{ $headerVariant?: 'default' | 'green' }>`
  ${({ theme }) => theme.fonts.reg16};
  color: ${({ theme }) => theme.colors.supportingCopy};
  padding: 24px 32px;
  flex-grow: 1;
  overflow-y: auto;
  text-align: left;
  text-wrap: wrap;
  display: flex;
  flex-direction: column;

  ${({ $headerVariant }) =>
    $headerVariant === 'green' &&
    `
      background: #c5e0b5;
      color: #33795c;
    `}
`

const DialogFooter = styled.div<{ $headerVariant?: 'default' | 'green' }>`
  padding: 18px 32px;
  align-items: center;
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  border-top: 1px solid ${({ theme }) => theme.colors.grey200};
  background: ${({ theme }) => theme.colors.white};

  /* Niger : vert partout sur la carte, y compris le bas (revu le
     2026-08-18 — l'essai précédent avec un bas blanc n'était pas voulu). */
  ${({ $headerVariant }) =>
    $headerVariant === 'green' &&
    `
      background: #c5e0b5;
      border-top: none;
    `}
`

export function Dialog({
  id,
  title,
  onClose,
  isOpen = true,
  children,
  actions,
  variant = 'small',
  width,
  titleIcon,
  headerVariant = 'default'
}: IDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const handleClose = () => {
    if (onClose) {
      onClose()
    }
  }

  const hasActions = actions && actions.length > 0

  // Niger : détection au mousedown, pas au click. Un <Select> rend son menu
  // via un portail attaché à document.body (voir Select.tsx,
  // menuPortalTarget) — un clic sur une option n'est alors plus un
  // descendant DOM du Dialog. react-select sélectionne l'option sur
  // l'événement CLICK (pas mousedown) : si on attend le click pour détecter
  // un clic "extérieur", react-select a déjà pu fermer/démonter son menu
  // avant que ce gestionnaire ne s'exécute, rendant peu fiable toute
  // vérification basée sur l'arborescence DOM à ce moment-là. En se basant
  // sur mousedown (qui précède toujours click), on inspecte le DOM avant
  // que quoi que ce soit d'autre n'ait pu réagir à l'interaction.
  const handleClickOutside = (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    const target = event.target as Node
    const isInsideSelectPortal =
      target instanceof Element &&
      target.closest('.react-select__menu-portal') !== null

    if (
      dialogRef.current &&
      !dialogRef.current.contains(target) &&
      !isInsideSelectPortal
    ) {
      handleClose()
    }
  }

  return (
    <>
      {isOpen && (
        <DialogWrapper onMouseDown={handleClickOutside}>
          <DialogContainer
            id={id}
            width={width}
            variant={variant}
            ref={dialogRef}
            role="dialog"
            data-testid={id}
          >
            <DialogHeader $headerVariant={headerVariant}>
              <DialogTitle>
                {titleIcon}
                <Text
                  variant="h2"
                  element="h2"
                  color={headerVariant === 'green' ? 'white' : 'grey600'}
                >
                  {title}
                </Text>
              </DialogTitle>
              {onClose && (
                <Button
                  id="close-dialog"
                  data-testid="close-dialog"
                  type="icon"
                  size="medium"
                  onClick={handleClose}
                >
                  <Icon
                    color={headerVariant === 'green' ? 'white' : 'currentColor'}
                    name="X"
                    size="large"
                    weight="bold"
                  />
                </Button>
              )}
            </DialogHeader>
            <DialogContent $headerVariant={headerVariant}>
              {children}
            </DialogContent>
            {hasActions && (
              <DialogFooter $headerVariant={headerVariant}>
                {actions}
              </DialogFooter>
            )}
          </DialogContainer>
        </DialogWrapper>
      )}
    </>
  )
}
