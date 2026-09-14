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

/**
 * Niger : bandeau vert plein pour les titres de section de formulaire
 * ("RENSEIGNEMENTS SUR L'ENFANT", etc.), calqué sur le rendu d'INCI (le
 * logiciel actuel de la DGECM-R) — remplace l'ancien rendu en simple
 * sous-titre gris (`SubHeader` de `@opencrvs/components`, encore utilisé
 * ailleurs dans l'app pour d'autres usages, volontairement non modifié ici).
 */
const GreenSectionHeader = styled.div`
  background: ${({ theme }) => theme.colors.brandGreen};
  color: ${({ theme }) => theme.colors.white};
  ${({ theme }) => theme.fonts.bold14};
  padding: 8px 16px;
  margin: 16px 0 12px 0;
  border-radius: 4px;
`

function PageHeaderInput({ children }: { children: React.ReactNode }) {
  return <GreenSectionHeader>{children}</GreenSectionHeader>
}

export const PageHeader = {
  Input: PageHeaderInput,
  Output: null
}
