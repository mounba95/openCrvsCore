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
import React, { useState } from 'react'
import styled, { keyframes } from 'styled-components'
import { defineMessages, useIntl } from 'react-intl'
import { Icon } from '@opencrvs/components/lib/Icon'

/**
 * Niger : bandeau "INFORMATIONS" défilant, calqué sur INCI (capture fournie
 * le 2026-08-18) — un seul message pour l'instant (voir `messages.text`,
 * modifiable via les traductions), défilement de gauche à droite (sens
 * explicitement demandé, inhabituel pour un bandeau défilant). Seul le
 * bouton pause/lecture est fonctionnel : avec un seul message, "précédent"/
 * "suivant" n'auraient rien à faire, donc pas ajoutés (voir principe
 * "pas d'implémentation à moitié faite").
 */

const Bar = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  background: #ffdb6c;
  border-radius: 6px;
  padding: 8px 16px;
  margin-bottom: 20px;
  overflow: hidden;
`

const Label = styled.span`
  ${({ theme }) => theme.fonts.bold14};
  color: #a4231f;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  flex-shrink: 0;
`

const Track = styled.div`
  position: relative;
  flex: 1;
  height: 20px;
  overflow: hidden;
`

const scrollLeftToRight = keyframes`
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(100%);
  }
`

const ScrollingText = styled.span<{ $paused: boolean }>`
  position: absolute;
  top: 0;
  left: 0;
  white-space: nowrap;
  ${({ theme }) => theme.fonts.reg14};
  color: #1a4d7a;
  animation: ${scrollLeftToRight} 18s linear infinite;
  animation-play-state: ${({ $paused }) => ($paused ? 'paused' : 'running')};
`

const ControlButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.brandGreen};
  color: ${({ theme }) => theme.colors.white};
  cursor: pointer;
  flex-shrink: 0;

  &:hover {
    background: ${({ theme }) => theme.colors.brandGreenDark};
  }
`

const messages = defineMessages({
  label: {
    id: 'v2.home.informationBar.label',
    defaultMessage: 'Informations',
    description: 'Libellé du bandeau défilant'
  },
  text: {
    id: 'v2.home.informationBar.text',
    defaultMessage:
      "OpenCRVS Niger - Plateforme de production des actes de l'état civil",
    description: 'Texte du bandeau défilant (modifiable via les traductions)'
  },
  pause: {
    id: 'v2.home.informationBar.pause',
    defaultMessage: 'Mettre en pause',
    description: 'Bouton pause du bandeau défilant'
  },
  play: {
    id: 'v2.home.informationBar.play',
    defaultMessage: 'Reprendre',
    description: 'Bouton lecture du bandeau défilant'
  }
})

export function InformationBar() {
  const intl = useIntl()
  const [paused, setPaused] = useState(false)

  return (
    <Bar>
      <Label>{intl.formatMessage(messages.label)}</Label>
      <Track>
        <ScrollingText $paused={paused}>
          {intl.formatMessage(messages.text)}
        </ScrollingText>
      </Track>
      <ControlButton
        aria-label={intl.formatMessage(
          paused ? messages.play : messages.pause
        )}
        type="button"
        onClick={() => setPaused((p) => !p)}
      >
        <Icon
          color="currentColor"
          name={paused ? 'Play' : 'Pause'}
          size="small"
        />
      </ControlButton>
    </Bar>
  )
}
