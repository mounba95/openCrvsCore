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
import { useTypedParams } from 'react-router-typesafe-routes/dom'
import { useIntl } from 'react-intl'
import { useSelector } from 'react-redux'
import { onlineManager } from '@tanstack/react-query'
import { Icon } from '@opencrvs/components/lib/Icon'
import { LogoutNavigation } from '@opencrvs/components/lib/icons/LogoutNavigation'
import { SettingsNavigation } from '@opencrvs/components/lib/icons/SettingsNavigation'
import { LeftNavigation } from '@opencrvs/components/lib/SideNavigation/LeftNavigation'
import { NavigationGroup } from '@opencrvs/components/lib/SideNavigation/NavigationGroup'
import { NavigationItem } from '@opencrvs/components/lib/SideNavigation/NavigationItem'
import { buttonMessages } from '@client/i18n/messages'
import { storage } from '@client/storage'
import { WORKQUEUE_TABS } from '@client/components/interface/WorkQueueTabs'
import { ROUTES } from '@client/v2-events/routes'
import { removeToken } from '@client/utils/authUtils'
import * as routes from '@client/navigation/routes'
import { removeUserDetails } from '@client/utils/userUtils'
import { clearActiveOffice } from '@client/v2-events/hooks/useActiveOffice'
import { getOfflineData } from '@client/offline/selectors'
import { getScope, getUserDetails } from '@client/profile/profileSelectors'
import { getLanguage } from '@client/i18n/selectors'
import { Avatar } from '@client/components/Avatar'
import {
  getUsersFullName,
  hasDraftWorkqueue,
  WORKQUEUE_DRAFT
} from '@client/v2-events/utils'
import { useDrafts } from '@client/v2-events/features/drafts/useDrafts'
import { useLocations } from '@client/v2-events/hooks/useLocations'
import { useCurrentUser } from '@client/v2-events/hooks/useCurrentUser'
import { trpcClient } from '@client/v2-events/trpc'
import { withSuspense } from '../../components/withSuspense'
import { OrganisationNavigationGroup } from './OrganisationNavigationGroup'
import { PerformanceNavigationGroup } from './PerformanceNavigationGroup'

const SCREEN_LOCK = 'screenLock'

function subscribeOnlineStatus(cb: () => void) {
  return onlineManager.subscribe(cb)
}

function getOnlineSnapshot() {
  return onlineManager.isOnline()
}

export async function logout(language?: string) {
  // Niger : libère tous les actes assignés à l'utilisateur avant de couper
  // sa session — sinon un acte reste verrouillé indéfiniment après un
  // logout, bloquant tout autre agent qui n'a pas le droit de le reprendre
  // (voir CONTEXTE-PROJET.md). Best-effort : un échec (ex. hors ligne) ne
  // doit jamais empêcher la déconnexion elle-même.
  try {
    await trpcClient.event.actions.assignment.unassignAllMine.mutate()
  } catch {
    // Best-effort only.
  }
  await storage.removeItem(SCREEN_LOCK)
  await removeToken()
  await removeUserDetails()
  clearActiveOffice()
  // redirect is handled at nginx level.
  window.location.assign(`/login?lang=${language ?? ''}`)
}

function SidebarComponent({
  menuCollapse,
  navigationWidth,
  isMobileView = false
}: {
  menuCollapse?: () => void // Only relevant for mobile view
  navigationWidth?: number
  isMobileView?: boolean
}) {
  const { slug: workqueueSlug } = useTypedParams(ROUTES.V2.WORKQUEUES.WORKQUEUE)
  const intl = useIntl()
  const scopes = useSelector(getScope)
  const { getLocation } = useLocations()

  const { getAllRemoteDrafts } = useDrafts()
  const drafts = getAllRemoteDrafts()

  const hasDraft = hasDraftWorkqueue(scopes ?? [])

  const navigate = useNavigate()
  const offlineCountryConfig = useSelector(getOfflineData)
  const userDetails = useSelector(getUserDetails)
  const language = useSelector(getLanguage)
  const isOnline = React.useSyncExternalStore(
    subscribeOnlineStatus,
    getOnlineSnapshot,
    () => true
  )

  let name = ''
  if (userDetails?.name) {
    name = getUsersFullName(userDetails.name)
  }

  const role =
    (userDetails?.role &&
      intl.formatMessage(
        {
          id: 'event.history.role',
          defaultMessage: 'Unknown'
        },
        {
          role: userDetails.role
        }
      )) ??
    ''
  // Niger : reflète la commune ACTIVE (bascule sans reconnexion), pas la
  // commune permanente — voir useCurrentUser.ts.
  const { currentUser } = useCurrentUser()
  const primaryOffice = currentUser.primaryOfficeId
    ? getLocation.useQuery(currentUser.primaryOfficeId).data?.name
    : undefined

  const avatar = <Avatar avatar={userDetails?.avatar} name={name} />

  const runningVer = String(localStorage.getItem('running-version'))

  return (
    <LeftNavigation
      applicationName={offlineCountryConfig.config.APPLICATION_NAME}
      applicationVersion={runningVer}
      assignedOffice={primaryOffice}
      avatar={() => avatar}
      isOnline={isOnline}
      name={name}
      navigationWidth={navigationWidth}
      role={role}
    >
      <NavigationGroup>
        {hasDraft && (
          <NavigationItem
            key={WORKQUEUE_DRAFT.slug}
            count={drafts.length}
            data-testid={`navigation_workqueue_${WORKQUEUE_DRAFT.slug}`}
            icon={() => <Icon name={WORKQUEUE_DRAFT.icon} size="small" />}
            id={`navigation_workqueue_${WORKQUEUE_DRAFT.slug}`}
            isSelected={WORKQUEUE_DRAFT.slug === workqueueSlug}
            label={intl.formatMessage(WORKQUEUE_DRAFT.name)}
            onClick={() => {
              navigate(
                ROUTES.V2.WORKQUEUES.WORKQUEUE.buildPath({
                  slug: WORKQUEUE_DRAFT.slug
                })
              )
              menuCollapse && menuCollapse()
            }}
          />
        )}
      </NavigationGroup>
      <OrganisationNavigationGroup
        currentWorkqueueSlug={workqueueSlug}
        menuCollapse={menuCollapse}
        primaryOfficeId={currentUser.primaryOfficeId}
      />
      <PerformanceNavigationGroup currentWorkqueueSlug={workqueueSlug} />
      {isMobileView && (
        <NavigationGroup>
          <NavigationItem
            icon={() => <SettingsNavigation />}
            id={`navigation_${WORKQUEUE_TABS.settings}`}
            isSelected={false}
            label={intl.formatMessage(buttonMessages[WORKQUEUE_TABS.settings])}
            onClick={() => {
              navigate(routes.SETTINGS)
              menuCollapse && menuCollapse()
            }}
          />
          <NavigationItem
            icon={() => <LogoutNavigation />}
            id={`navigation_${WORKQUEUE_TABS.logout}`}
            label={intl.formatMessage(buttonMessages[WORKQUEUE_TABS.logout])}
            onClick={async () => logout(language)}
          />
        </NavigationGroup>
      )}
    </LeftNavigation>
  )
}

export const Sidebar = withSuspense(SidebarComponent)
