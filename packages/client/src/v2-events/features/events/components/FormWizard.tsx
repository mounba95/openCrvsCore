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
import React, { PropsWithChildren } from 'react'
import { defineMessages, useIntl } from 'react-intl'
import styled from 'styled-components'
import { PageConfig } from '@opencrvs/commons/client'
import { Button } from '@opencrvs/components/src/Button'
import {
  BottomActionBar,
  Content,
  ContentSize
} from '@opencrvs/components/src/Content'
import { Frame } from '@opencrvs/components/src/Frame'
import { buttonMessages } from '@client/i18n/messages'
import { Panel } from '@client/v2-events/features/home/PanelCard'
import { FormStepList } from './FormStepList'

export const messages = defineMessages({
  back: {
    defaultMessage: 'Back',
    description: 'Back button text',
    id: 'buttons.back'
  },
  goToReview: {
    defaultMessage: 'Go to review',
    description: 'Go to review button text',
    id: 'buttons.goToReview'
  },
  steps: {
    defaultMessage: 'Étapes',
    description: 'Titre de la carte de navigation entre étapes du formulaire',
    id: 'v2.formWizard.steps'
  }
})

// Niger : fond vert pâle (comme le corps de la modale/les panneaux
// d'accueil) au lieu d'une carte blanche — calqué sur la page de
// déclaration d'INCI (capture fournie le 2026-08-18), qui garde cette
// teinte verte sur toute la carte (étapes + champs), pas seulement en
// liseré. Remplace le choix précédent ("carte blanche + liseré vert").
const AccentContent = styled(Content)`
  background: #c5e0b5;
  border-top: 4px solid ${({ theme }) => theme.colors.brandGreen};
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);

  ${BottomActionBar} {
    justify-content: flex-end;
  }
`

// Détache légèrement la carte du bord gauche — un simple wrapper plutôt
// qu'une marge sur AccentContent, pour éviter un conflit de spécificité CSS
// avec la règle `${Content} { margin: 0 }` de Frame.LayoutForm.
const CardWrapper = styled.div`
  margin-left: 20px;
`

// Niger : "ÉTAPES" est sa propre carte, distincte du formulaire — espace
// visible entre les deux (fond gris de la page, voir colors.ts), calqué
// sur INCI (capture fournie le 2026-08-18) plutôt qu'une colonne partagée
// à l'intérieur d'une seule carte.
const Body = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 20px;
`

const StepsCardWrapper = styled.div`
  width: 260px;
  flex-shrink: 0;

  @media (max-width: ${({ theme }) => theme.grid.breakpoints.md}px) {
    display: none;
  }
`

const Fields = styled.div`
  flex: 1;
  min-width: 0;
`

export type FormWizardProps = PropsWithChildren<{
  currentPage: number
  /** Callback when the user clicks the "Continue" button */
  onNextPage: () => void
  onPreviousPage?: () => void

  /** Callback when the user submits the form wizard */
  onSubmit: () => void
  pageTitle: string
  showReviewButton?: boolean
  /** All visible pages of the current wizard, used to render the step list */
  stepListPages?: PageConfig[]
  /** Furthest page index the user has reached, i.e. which steps are clickable */
  highestVisitedIdx?: number
  /** Callback when the user clicks an already-visited step in the step list */
  onJumpToPage?: (pageId: string) => void
  /**
   * Niger : taille de la carte — LARGE (défaut, inchangé) pour les
   * formulaires d'événement à plusieurs colonnes, NORMAL/SMALL pour des
   * formulaires plus courts (ex: création d'utilisateur) où une carte pleine
   * largeur fait paraître les champs disproportionnés. Voir UserEditor.tsx.
   */
  contentSize?: ContentSize
}>

export const FormWizard = ({
  children,
  currentPage,
  onSubmit,
  pageTitle,
  onNextPage,
  onPreviousPage,
  showReviewButton,
  stepListPages,
  highestVisitedIdx,
  onJumpToPage,
  continueButtonText,
  contentSize = ContentSize.LARGE
}: FormWizardProps & {
  continueButtonText?: string
}) => {
  const intl = useIntl()

  const bottomActionButtons = [
    currentPage > 0 && (
      <Button key="previous" size="small" type="secondary" onClick={onPreviousPage}>
        {intl.formatMessage(messages.back)}
      </Button>
    ),
    <Button
      key="next"
      role="button"
      size="small"
      type="primary"
      onClick={() => onNextPage()}
    >
      {continueButtonText ?? intl.formatMessage(buttonMessages.continueButton)}
    </Button>,
    showReviewButton && (
      <Button key="review" size="small" type="secondary" onClick={onSubmit}>
        {intl.formatMessage(messages.goToReview)}
      </Button>
    )
  ].filter((button): button is React.ReactElement => Boolean(button))

  return (
    <Frame.LayoutForm>
      <Frame.Section>
        <CardWrapper>
          <Body>
            {/* Niger : pas de carte "Étapes" quand il y a moins de 2 pages
                visibles — sinon une carte vide/orpheline s'affiche (ex. le
                formulaire de création d'utilisateur, qui combine plusieurs
                étapes en une seule page). Même condition que le repli
                interne de FormStepList. */}
            {stepListPages && onJumpToPage && stepListPages.length >= 2 && (
              <StepsCardWrapper>
                <Panel title={intl.formatMessage(messages.steps)} variant="green">
                  <FormStepList
                    currentPageIndex={currentPage}
                    highestVisitedIndex={highestVisitedIdx ?? currentPage}
                    pages={stepListPages}
                    onSelect={onJumpToPage}
                  />
                </Panel>
              </StepsCardWrapper>
            )}
            <Fields>
              <AccentContent
                bottomActionButtons={bottomActionButtons}
                showTitleOnMobile={true}
                size={contentSize}
                title={pageTitle}
              >
                {children}
              </AccentContent>
            </Fields>
          </Body>
        </CardWrapper>
      </Frame.Section>
    </Frame.LayoutForm>
  )
}
