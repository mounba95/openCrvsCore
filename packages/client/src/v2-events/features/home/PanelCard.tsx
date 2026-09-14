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
import styled, { css } from 'styled-components'

/**
 * Niger : carte de panneau réutilisée par les 3 blocs de la page d'accueil
 * (Recherche simple / Création / Aujourd'hui), calquée visuellement sur
 * INCI — bandeau de titre coloré (vert ou or) + corps de la même teinte,
 * plus pâle, plutôt qu'une carte blanche générique. Couleurs exactes
 * reprises de la feuille de style d'INCI (fournie par l'utilisateur le
 * 2026-08-18) : --panel-title-bg-color, --panel-content-bg-color,
 * --panel-news-bg-color/--panel-today-bg-color, --primary-text-color.
 */

const variantStyles = {
  green: css`
    --panel-header-bg: #3faa4e;
    --panel-header-fg: #ffffff;
    --panel-body-bg: #c5e0b5;
    --panel-body-fg: #33795c;
  `,
  yellow: css`
    --panel-header-bg: #ffdb6c;
    --panel-header-fg: #6b4c00;
    --panel-body-bg: #ffdb6c;
    --panel-body-fg: #6b4c00;
  `
}

export const PanelCard = styled.div<{ $variant: 'green' | 'yellow' }>`
  ${({ $variant }) => variantStyles[$variant]};
  display: flex;
  flex-direction: column;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  height: 100%;
`

export const PanelHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 10px 20px;
  background: var(--panel-header-bg);
  color: var(--panel-header-fg);
  ${({ theme }) => theme.fonts.bold16};
  text-transform: uppercase;
  letter-spacing: 0.02em;
`

export const PanelBody = styled.div`
  flex: 1;
  padding: 16px 20px 20px 20px;
  background: var(--panel-body-bg);
  color: var(--panel-body-fg);
`

export function Panel({
  variant,
  title,
  headerAction,
  children
}: {
  variant: 'green' | 'yellow'
  title: React.ReactNode
  headerAction?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <PanelCard $variant={variant}>
      <PanelHeader>
        <span>{title}</span>
        {headerAction}
      </PanelHeader>
      <PanelBody>{children}</PanelBody>
    </PanelCard>
  )
}
