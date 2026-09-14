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
import { useHomeDashboardCounts } from '@client/v2-events/hooks/useHomeDashboardCounts'
import { DashboardTile } from './DashboardTile'

/**
 * Niger : "LE DD/MM/AAAA" affiché sur la même ligne que le titre du
 * panneau (voir Home.tsx, composé dans le `title` du `Panel`) — comme sur
 * INCI.
 */
export function useTodayLabel() {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date())
}

/**
 * Niger : tableau de bord "Aujourd'hui" de la page d'accueil, inspiré
 * d'INCI — voir dashboardTiles.config.ts pour la liste des tuiles et leur
 * correspondance avec les files d'attente OpenCRVS.
 */
export function AujourdHui() {
  const { counts } = useHomeDashboardCounts()

  if (counts.length === 0) {
    return null
  }

  return (
    <>
      {counts.map(({ tile, count }) => (
        <DashboardTile key={tile.id} count={count} tile={tile} />
      ))}
    </>
  )
}
