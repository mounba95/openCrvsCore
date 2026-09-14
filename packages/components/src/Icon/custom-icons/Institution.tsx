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
import { CustomIcon } from '../types'

/**
 * Niger : bâtiment officiel (colonnes + fronton + drapeau) utilisé pour le
 * bouton "Retour à l'accueil" (voir BackToHomeButton dans
 * layouts/workqueues/index.tsx) — calqué sur l'icône réelle d'INCI (capture
 * fournie le 2026-09-12), à la place de la maison générique d'origine.
 */
export const Institution: CustomIcon = ({ size, color, ...rest }) => (
  <svg
    fill="none"
    height={size}
    viewBox="0 0 24 24"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
    {...rest}
  >
    <path d="M12 1.5V5" stroke={color} strokeLinecap="round" strokeWidth={1.6} />
    <path
      d="M12 1.5L17 3V4L12 5"
      fill={color}
      stroke={color}
      strokeLinejoin="round"
      strokeWidth={1.2}
    />
    <path
      d="M2.5 9.5L12 4.5L21.5 9.5"
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
    />
    <path d="M4 9.5V19" stroke={color} strokeLinecap="round" strokeWidth={1.8} />
    <path d="M8 9.5V19" stroke={color} strokeLinecap="round" strokeWidth={1.8} />
    <path d="M12 9.5V19" stroke={color} strokeLinecap="round" strokeWidth={1.8} />
    <path d="M16 9.5V19" stroke={color} strokeLinecap="round" strokeWidth={1.8} />
    <path d="M20 9.5V19" stroke={color} strokeLinecap="round" strokeWidth={1.8} />
    <path d="M2.5 19H21.5" stroke={color} strokeLinecap="round" strokeWidth={1.8} />
    <path d="M1.5 22H22.5" stroke={color} strokeLinecap="round" strokeWidth={1.8} />
  </svg>
)
