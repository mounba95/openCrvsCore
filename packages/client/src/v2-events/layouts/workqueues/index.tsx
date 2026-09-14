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
import { useNavigate } from 'react-router-dom'
import { defineMessages, useIntl } from 'react-intl'
import { useTypedParams } from 'react-router-typesafe-routes/dom'
import { useSelector } from 'react-redux'
import styled from 'styled-components'
import { AppBar, Button, Frame, Icon } from '@opencrvs/components'
import {
  canUserCreateEvent,
  getAcceptedScopesByType
} from '@opencrvs/commons/client'
import { ROUTES } from '@client/v2-events/routes'
import { ProfileMenu } from '@client/components/ProfileMenu'
import { SearchToolbar } from '@client/v2-events/features/events/components/SearchToolbar'
import { useAllWorkqueueConfigurations } from '@client/v2-events/features/events/useAllWorkqueueConfigurations'
import { getScope } from '@client/profile/profileSelectors'
import { useEventConfigurations } from '@client/v2-events/features/events/useEventConfiguration'
import { emptyMessage, getUsersFullName } from '@client/v2-events/utils'
import { constantsMessages } from '@client/i18n/messages/constants'
import coatOfArmsNiger from '@client/v2-events/assets/coat-of-arms-niger.webp'
import { useCurrentUser } from '@client/v2-events/hooks/useCurrentUser'
import { useChangeOffice } from '@client/components/ChangeOfficeModal'
import { Hamburger } from '../sidebar/Hamburger'
import { Sidebar } from '../sidebar/Sidebar'

/**
 * Checks if the user has the `record.create` scope for any event type.
 * @returns true if the user has the `record.create` scope for any event type, false otherwise.
 */
export function useUserMayCreateEvents() {
  const scopes = useSelector(getScope) ?? []
  const eventConfigurations = useEventConfigurations()
  return eventConfigurations.some(({ id }) => canUserCreateEvent(scopes, id))
}

/**
 * Niger : le bouton "+" a été retiré — les cartes de création (voir
 * `CreateEventCards.tsx`) sont désormais affichées directement en haut de
 * chaque page de messagerie, plus besoin de cliquer pour les découvrir.
 */
export function DesktopCenter() {
  return <SearchToolbar />
}

const messages = defineMessages({
  backToHome: {
    id: 'v2.workqueueLayout.backToHome',
    defaultMessage: "Page d'accueil",
    description: "Bouton retour vers la page d'accueil"
  }
})

/**
 * Niger : icône "maison" dans un cadre (une "case"), inspirée du logo
 * d'INCI en haut à gauche de son bandeau vert — remplace l'ancien bouton
 * texte "Page d'accueil" (demande utilisateur du 2026-08-18). Partagé avec
 * `SearchLayout` (../search), qui affichait le même bouton texte.
 */
const HomeIconBox = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 1px solid ${({ theme }) => theme.colors.grey300};
  border-radius: 6px;
  background: ${({ theme }) => theme.colors.white};
  color: ${({ theme }) => theme.colors.brandGreen};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.grey100};
  }
  &:active {
    background: ${({ theme }) => theme.colors.grey200};
  }
`

// Niger : armoiries de la République du Niger + sigle "DGECMR" (Direction
// Générale de l'État Civil, des Migrations et des Réfugiés) à côté du
// bouton maison, dans le bandeau vert (image fournie par l'utilisateur le
// 2026-08-18, remplace l'emoji drapeau utilisé en attendant). En gras et
// blanc pour bien ressortir sur le fond vert, comme demandé.
const CoatOfArmsImg = styled.img`
  height: 32px;
  width: auto;
`

const AgencyName = styled.span`
  ${({ theme }) => theme.fonts.h4};
  color: ${({ theme }) => theme.colors.white};
  white-space: nowrap;
`

// Niger : badge "Nom de l'agent connecté (commune)" dans le bandeau vert,
// sur le modèle du badge affiché par INCI (demande utilisateur du
// 2026-08-18). Partagé avec `SearchLayout`.
const UserOfficeBadgeWrapper = styled.div`
  display: flex;
  align-items: center;
  height: 32px;
  padding: 0 12px;
  border: 1px solid #58b368;
  border-radius: 4px;
  background: ${({ theme }) => theme.colors.white};
  color: #33795c;
  ${({ theme }) => theme.fonts.bold14};
  white-space: nowrap;
`

export function UserOfficeBadge() {
  const { currentUser } = useCurrentUser()
  const { officeName } = useChangeOffice()

  const userName = currentUser?.name
    ? getUsersFullName(currentUser.name)
    : undefined

  if (!userName) {
    return null
  }

  return (
    <UserOfficeBadgeWrapper>
      {userName}
      {officeName ? `  (${officeName})` : ''}
    </UserOfficeBadgeWrapper>
  )
}

export function BackToHomeButton() {
  const navigate = useNavigate()
  const intl = useIntl()
  return (
    <>
      <HomeIconBox
        aria-label={intl.formatMessage(messages.backToHome)}
        id="back-to-home"
        title={intl.formatMessage(messages.backToHome)}
        onClick={() => navigate(ROUTES.V2.path)}
      >
        <Icon name="Institution" size="medium" />
      </HomeIconBox>
      <CoatOfArmsImg alt="République du Niger" src={coatOfArmsNiger} />
      <AgencyName>DGECMR</AgencyName>
    </>
  )
}

/**
 * Basic frame for the workqueues. Includes the left navigation and the app bar.
 */
export function WorkqueueLayout({
  children,
  title
}: {
  children: React.ReactNode
  title?: string
}) {
  const { slug: workqueueSlug } = useTypedParams(ROUTES.V2.WORKQUEUES.WORKQUEUE)
  const navigate = useNavigate()
  const intl = useIntl()
  const workqueues = useAllWorkqueueConfigurations()
  const workqueueConfig = workqueues.find(({ slug }) => slug === workqueueSlug)

  const scopes = useSelector(getScope) ?? []

  const hasSearchScope =
    getAcceptedScopesByType({
      acceptedScopes: ['record.search'],
      scopes
    }).length > 0

  return (
    <Frame
      header={
        <AppBar
          desktopLeft={<BackToHomeButton />}
          desktopRight={
            <>
              <UserOfficeBadge />
              <ProfileMenu key="profileMenu" />
            </>
          }
          mobileLeft={<Hamburger />}
          mobileRight={
            hasSearchScope && (
              <Button
                aria-label="Go to search"
                type={'icon'}
                onClick={() => navigate(ROUTES.V2.SEARCH.buildPath({}))}
              >
                <Icon color="primary" name="MagnifyingGlass" size="medium" />
              </Button>
            )
          }
          mobileTitle={
            title ?? intl.formatMessage(workqueueConfig?.name ?? emptyMessage)
          }
        />
      }
      navigation={<Sidebar key={workqueueSlug} />}
      skipToContentText={intl.formatMessage(
        constantsMessages.skipToMainContent
      )}
    >
      {children}
    </Frame>
  )
}
