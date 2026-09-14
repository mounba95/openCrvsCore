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
import React, { useEffect } from 'react'
import styled from 'styled-components'
import { defineMessages, useIntl } from 'react-intl'
import { useNavigate } from 'react-router-dom'
import { Button, Icon, Loader } from '@opencrvs/components'
import { WorkqueueLayout } from '@client/v2-events/layouts'
import { useUserMayCreateEvents } from '@client/v2-events/layouts/workqueues'
import { CreateEventCards } from '@client/v2-events/layouts/workqueues/CreateEventCards'
import { useHomePage } from '@client/hooks/useHomePage'
import { useCountryConfigWorkqueueConfigurations } from '@client/v2-events/features/events/useCountryConfigWorkqueueConfigurations'
import { useHomeDashboardCounts } from '@client/v2-events/hooks/useHomeDashboardCounts'
import { RechercheSimple } from './RechercheSimple'
import { AujourdHui, useTodayLabel } from './AujourdHui'
import { Panel } from './PanelCard'
import { InformationBar } from './InformationBar'



const Wrapper = styled.div`
  max-width: 1400px;
  margin: 24px 0;
  padding: 0 24px;
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: minmax(420px, 520px) 1fr;
  grid-template-rows: auto 1fr;
  gap: 20px;
  align-items: start;

  @media (max-width: ${({ theme }) => theme.grid.breakpoints.lg}px) {
    grid-template-columns: 1fr;
    grid-template-rows: none;
  }
`

const SearchSection = styled.div`
  grid-column: 1;
  grid-row: 1 / 3;

  @media (max-width: ${({ theme }) => theme.grid.breakpoints.lg}px) {
    grid-column: 1;
    grid-row: auto;
  }
`

const CreationSection = styled.div`
  grid-column: 2;
  grid-row: 1;

  @media (max-width: ${({ theme }) => theme.grid.breakpoints.lg}px) {
    grid-column: 1;
    grid-row: auto;
  }
`

const DashboardSection = styled.div`
  grid-column: 2;
  grid-row: 2;

  @media (max-width: ${({ theme }) => theme.grid.breakpoints.lg}px) {
    grid-column: 1;
    grid-row: auto;
  }
`

const RefreshButton = styled(Button)`
  min-width: unset;
  padding: 4px;
  /* Niger : le bouton icône est vert par défaut (theme.colors.brandGreen),
     invisible sur le bandeau or du panneau Aujourd'hui — on reprend la
     même couleur que le titre du panneau (voir DashboardTitleMain
     ci-dessous, repris de la feuille de style d'INCI) pour que l'icône
     reste lisible. */
  color: #846d28;

  &:hover {
    background: rgba(0, 0, 0, 0.08);
  }
  &:active {
    background: rgba(0, 0, 0, 0.15);
  }
`

const DashboardTitleBlock = styled.span`
  display: block;
`

/**
 * Niger : titre "AUJOURD'HUI" du panneau — valeurs (couleur, taille, ombre
 * portée) reprises telles quelles de la feuille de style d'INCI
 * (`.today .date::before`, qui génère ce texte par contenu CSS). Chez nous
 * c'est un texte normal plutôt qu'un ::before, mais le rendu visuel est
 * identique.
 */
const DashboardTitleMain = styled.span`
  display: block;
  font-size: 26px;
  font-weight: 700;
  color: #846d28;
  text-shadow:
    0px 4px 3px rgba(38, 38, 38, 0.4),
    0px 8px 13px rgba(38, 38, 38, 0.1),
    0px 18px 23px rgba(38, 38, 38, 0.1);
  margin-bottom: 6px;
`

const DashboardTitleDate = styled.span`
  display: block;
  font-size: 13px;
  font-weight: 700;
  color: #443f2d;
`

const messages = defineMessages({
  title: {
    id: 'v2.home.title',
    defaultMessage: 'Accueil',
    description: "Titre de la page d'accueil"
  },
  searchTitle: {
    id: 'v2.home.simpleSearch.panelTitle',
    defaultMessage: 'Recherche simple',
    description: 'Titre du bandeau du panneau de recherche simple'
  },
  creationTitle: {
    id: 'v2.home.creation.panelTitle',
    defaultMessage: 'Création',
    description: 'Titre du bandeau du panneau de création'
  },
  dashboardTitle: {
    id: 'v2.home.dashboard.panelTitle',
    defaultMessage: "Aujourd'hui",
    description: "Titre du bandeau du panneau Aujourd'hui"
  },
  dashboardTitleDate: {
    id: 'v2.home.dashboard.panelTitleDate',
    defaultMessage: 'Le {date}',
    description:
      "Date du jour affichée à côté du titre du panneau Aujourd'hui"
  }
})

function HomeComponent() {
  const intl = useIntl()
  const navigate = useNavigate()
  const { path } = useHomePage()
  const workqueues = useCountryConfigWorkqueueConfigurations()
  const mayCreateEvents = useUserMayCreateEvents()
  const { counts, refetchAll } = useHomeDashboardCounts()
  const todayLabel = useTodayLabel()

  const hasNoWorkqueueAccess = workqueues.length === 0

  useEffect(() => {
  
    if (hasNoWorkqueueAccess) {
      navigate(path, { replace: true })
    }
  }, [hasNoWorkqueueAccess, navigate, path])

  if (hasNoWorkqueueAccess) {
    return <Loader id="home_redirect" />
  }

  return (
    <WorkqueueLayout title={intl.formatMessage(messages.title)}>
      <Wrapper>
        <InformationBar />
        <Grid>
          <SearchSection>
            <Panel
              title={intl.formatMessage(messages.searchTitle)}
              variant="green"
            >
              <RechercheSimple />
            </Panel>
          </SearchSection>
          {mayCreateEvents && (
            <CreationSection>
              <Panel
                title={intl.formatMessage(messages.creationTitle)}
                variant="green"
              >
                <CreateEventCards embedded />
              </Panel>
            </CreationSection>
          )}
          {counts.length > 0 && (
            <DashboardSection>
              <Panel
                headerAction={
                  <RefreshButton
                    aria-label="Actualiser"
                    size="small"
                    type="icon"
                    onClick={() => refetchAll()}
                  >
                    <Icon name="ArrowCounterClockwise" />
                  </RefreshButton>
                }
                title={
                  <DashboardTitleBlock>
                    <DashboardTitleMain>
                      {intl.formatMessage(messages.dashboardTitle)}
                    </DashboardTitleMain>
                    <DashboardTitleDate>
                      {intl.formatMessage(messages.dashboardTitleDate, {
                        date: todayLabel
                      })}
                    </DashboardTitleDate>
                  </DashboardTitleBlock>
                }
                variant="yellow"
              >
                <AujourdHui />
              </Panel>
            </DashboardSection>
          )}
        </Grid>
      </Wrapper>
    </WorkqueueLayout>
  )
}

export const Home = HomeComponent
