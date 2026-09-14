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
import { useQuery } from '@tanstack/react-query'
import {
  fetchStatistics,
  fetchStatisticsLocations,
  StatisticsFilters
} from './statisticsApi'

export function useStatistics(filters: StatisticsFilters) {
  return useQuery({
    queryKey: ['statistics', filters],
    queryFn: () => fetchStatistics(filters)
  })
}

/**
 * Hiérarchie région/département/commune pour les filtres en cascade —
 * change rarement, un long staleTime évite un rechargement à chaque
 * ouverture de la page.
 */
export function useStatisticsLocations() {
  return useQuery({
    queryKey: ['statistics-locations'],
    queryFn: fetchStatisticsLocations,
    staleTime: 1000 * 60 * 60 * 24
  })
}
