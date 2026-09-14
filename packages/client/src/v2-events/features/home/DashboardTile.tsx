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
import { useIntl } from 'react-intl'
import { useNavigate } from 'react-router-dom'
import { Icon } from '@opencrvs/components/lib/Icon'
import { ROUTES } from '@client/v2-events/routes'
import { DashboardTileConfig } from './dashboardTiles.config'

const Row = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 8px 2px;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  ${({ theme }) => theme.fonts.reg16};
  color: #000000;

  &:hover {
    text-decoration: underline;
  }
`

const Count = styled.span`
  ${({ theme }) => theme.fonts.bold16};
  color: ${({ theme }) => theme.colors.negative};
  display: flex;
  align-items: center;
  gap: 8px;
`

const RefreshIcon = styled(Icon)`
  flex-shrink: 0;
`

/**
 * Niger : pour cette v1, le clic renvoie vers la vraie file (non filtrée par
 * type d'acte, même pour les tuiles "copies conformes") — pas de nouvelle
 * vue filtrée. Voir CONTEXTE-PROJET.md.
 */
export function DashboardTile({
  tile,
  count
}: {
  tile: DashboardTileConfig
  count: number | undefined
}) {
  const intl = useIntl()
  const navigate = useNavigate()

  return (
    <Row
      type="button"
      onClick={() =>
        navigate(ROUTES.V2.WORKQUEUES.WORKQUEUE.buildPath({ slug: tile.slug }))
      }
    >
      <span>{intl.formatMessage(tile.label)}</span>
      <Count>
        {count ?? '…'}
        <RefreshIcon name="ArrowCounterClockwise" size="small" />
      </Count>
    </Row>
  )
}
