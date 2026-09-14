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

import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '@opencrvs/components/lib/Icon'
import { NavigationGroup } from '@opencrvs/components/lib/SideNavigation/NavigationGroup'
import { NavigationItem } from '@opencrvs/components/lib/SideNavigation/NavigationItem'
import { usePermissions } from '@client/hooks/useAuthorization'
import { ROUTES } from '@client/v2-events/routes'

/**
 * Niger : un seul lien "Statistiques" vers la page native (voir
 * `features/statistics/StatisticsPage.tsx`), qui a remplacé le tableau de
 * bord Metabase intégré en iframe — `window.config.DASHBOARDS` reste dans
 * le schéma de configuration (requis) mais est désormais vide.
 */
export function PerformanceNavigationGroup({
  currentWorkqueueSlug
}: {
  currentWorkqueueSlug?: string
}) {
  const navigate = useNavigate()
  const { hasScope } = usePermissions()

  return (
    <>
      {hasScope('performance.read-dashboards') && (
        <NavigationGroup>
          <NavigationItem
            icon={() => <Icon name="ChartLine" size="small" />}
            id="navigation_statistics"
            isSelected={currentWorkqueueSlug === 'statistics'}
            label="Statistiques"
            onClick={() => {
              navigate(ROUTES.V2.STATISTICS.path)
            }}
          />
          <NavigationItem
            icon={() => <Icon name="FileText" size="small" />}
            id="navigation_statistics_reports"
            isSelected={currentWorkqueueSlug === 'statistics-reports'}
            label="États statistiques"
            onClick={() => {
              navigate(ROUTES.V2.STATISTICS_REPORTS.path)
            }}
          />
        </NavigationGroup>
      )}
    </>
  )
}
