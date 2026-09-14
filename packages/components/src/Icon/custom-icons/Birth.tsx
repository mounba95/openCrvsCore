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
 * Niger : landau, utilisé pour "Naissance" sur la page d'accueil (voir
 * CreateEventCards.tsx) — tracé exact exporté depuis les icônes CityWeb
 * (fourni par l'utilisateur le 2026-09-13, dossier icons_cityweb_export/).
 */
export const Birth: CustomIcon = ({ size, color, ...rest }) => (
  <svg
    height={size}
    viewBox="0 0 1024 1024"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
    {...rest}
  >
    <path
      d="M478.879 778.158c0-60.213-48.812-109.025-109.025-109.025s-109.025 48.812-109.025 109.025c0 60.213 48.812 109.025 109.025 109.025s109.025-48.812 109.025-109.025zM845.6 778.158c-48.201 55.064-178.404 113.98-178.404 113.98l-91.526-315.857-114.872-0.338-51.299 68.392-100.043 0.242-50.951-69.225-135.643-0.397v-44.602h793.357l2.748 24.779h0.97c0.001 0.020 29.732 104.090-74.337 223.026zM127.024 500.64c0 0-9.911-59.46 64.423-123.873 74.336-64.424 113.982-59.469 113.982-59.469s16.813-0.891 43.769-2.053l126.051-86.066-151.168-124.086 15.738-19.125 156.743 128.654 162.23-110.729 13.938 20.481-156.21 106.625 98.177 80.607c31.438 0.968 59.972 2.749 82.233 5.651 113.98 14.868 188.315 183.343 188.315 183.343l-758.221 0.040zM495.216 245.595l-99.472 67.908c51.619-1.78 117.93-3.329 178.996-2.671l-79.524-65.237zM340.119 10.045c-54.651 0-99.114 44.462-99.114 99.113 0 12.066 2.163 23.913 6.427 35.209l18.545-7c-3.417-9.052-5.149-18.543-5.149-28.209 0-43.721 35.569-79.291 79.291-79.291s79.291 35.57 79.291 79.291-35.569 79.291-79.291 79.291v19.822c54.651 0 99.114-44.462 99.114-99.113s-44.462-99.113-99.114-99.113zM647.372 15c-54.652 0-99.114 44.462-99.114 99.114 0 54.651 44.462 99.113 99.114 99.113 19.906 0 39.074-5.866 55.432-16.966l-11.131-16.402c-13.060 8.861-28.379 13.546-44.301 13.546-43.722 0-79.292-35.57-79.292-79.291s35.57-79.292 79.292-79.292c43.721 0 79.291 35.57 79.291 79.292h19.822c0-54.652-44.462-99.114-99.113-99.114z"
      fill={color}
      transform="translate(0, 960) scale(1, -1)"
    />
  </svg>
)
