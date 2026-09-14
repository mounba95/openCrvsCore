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
 * Niger : cercueil, utilisé pour "Décès" sur la page d'accueil (voir
 * CreateEventCards.tsx) — tracé exact exporté depuis les icônes CityWeb
 * (fourni par l'utilisateur le 2026-09-13, dossier icons_cityweb_export/).
 */
export const Tombstone: CustomIcon = ({ size, color, ...rest }) => (
  <svg
    height={size}
    viewBox="0 0 1024 1024"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
    {...rest}
  >
    <path
      d="M786.493 135.168h-33.734l29.92 644.616h-99.854c-9.832 9.829-25.552 24.417-45.355 38.955-47.479 34.854-94.332 52.526-139.256 52.526-45.512 0-92.292-19.113-139.040-56.808-19.044-15.356-34.126-30.756-43.683-41.3h-115.681l40.433-637.988h-32.416l-52.755-52.796-4.067-102.872h691.74v99.419l-56.252 56.248zM274.385 703.156h74.235l10.51 13.446c0.662 0.847 68.156 84.662 139.082 84.662 72.649 0 142.556-78.716 143.209-79.46l10.464-12.020h57.469l-26.672-574.616h-372.3l-35.997 567.988zM772.743 49.5h-548.917l0.109 2.757 12.902 12.911h7.841l0.051-0.799 504.75 0.151 0.030 0.648h7.989l15.244-15.244v-0.424zM346.862 593.458h289.373v-36.586h-289.373v36.586zM349.37 476.416h289.364v-36.585h-289.364v36.585z"
      fill={color}
      transform="translate(0, 960) scale(1, -1)"
    />
  </svg>
)
