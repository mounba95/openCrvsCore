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
import { useQueries } from '@tanstack/react-query'
import {
  deserializeQuery,
  WorkqueueConfig,
  WorkqueueCountInput,
  WorkqueueCountOutput
} from '@opencrvs/commons/client'
import { useTRPC } from '@client/v2-events/trpc'
import { useCurrentUser } from '@client/v2-events/hooks/useCurrentUser'
import { useCountryConfigWorkqueueConfigurations } from '@client/v2-events/features/events/useCountryConfigWorkqueueConfigurations'
import { DASHBOARD_TILES } from '@client/v2-events/features/home/dashboardTiles.config'

/**
 * Niger : compteurs du tableau de bord "Aujourd'hui" de la page d'accueil.
 * Chaque tuile référence désormais directement une VRAIE file d'attente déjà
 * scindée par type d'acte côté country-config (ex: `pending-registration` vs
 * `pending-registration-certified-copy`) — plus besoin de reconstruire un
 * filtre par type d'événement ici, `deserializeQuery` suffit tel quel.
 */
export function useHomeDashboardCounts() {
  const { currentUser: user } = useCurrentUser()
  const trpc = useTRPC()
  const countryConfigWorkqueues = useCountryConfigWorkqueueConfigurations()

  const visibleTiles = DASHBOARD_TILES.filter((tile) =>
    countryConfigWorkqueues.some((w) => w.slug === tile.slug)
  )

  const results = useQueries({
    queries: visibleTiles.map((tile) => {
      const baseConfig = countryConfigWorkqueues.find(
        (w) => w.slug === tile.slug
      ) as WorkqueueConfig
      const input: WorkqueueCountInput = [
        { slug: tile.slug, query: deserializeQuery(baseConfig.query, user) }
      ]
      return {
        ...trpc.workqueue.count.queryOptions(input),
        queryKey: trpc.workqueue.count.queryKey(input),
        refetchInterval: 20000
      }
    })
  })

  return {
    counts: visibleTiles.map((tile, index) => ({
      tile,
      count: (results[index].data as WorkqueueCountOutput | undefined)?.[
        tile.slug
      ]
    })),
    refetchAll: () => Promise.all(results.map((result) => result.refetch()))
  }
}
