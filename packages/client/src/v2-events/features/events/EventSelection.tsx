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

import React, { useState } from 'react'
import { defineMessages, useIntl } from 'react-intl'
import { useNavigate } from 'react-router-dom'
import { useTypedSearchParams } from 'react-router-typesafe-routes/dom'
import { useSelector } from 'react-redux'
import { AppBar } from '@opencrvs/components/lib/AppBar'
import { Button } from '@opencrvs/components/lib/Button'
import { Content, ContentSize } from '@opencrvs/components/lib/Content'
import { ErrorText } from '@opencrvs/components/lib/ErrorText'
import { Frame } from '@opencrvs/components/lib/Frame'
import { Icon } from '@opencrvs/components/lib/Icon'
import { RadioGroup, RadioSize } from '@opencrvs/components/lib/Radio'
import { Stack } from '@opencrvs/components/lib/Stack'
import { SuspenseLoadingFallback } from '@client/v2-events/components/SuspenseLoadingFallback'
import { ROUTES } from '@client/v2-events/routes'
import { createTemporaryId } from '@client/v2-events/utils'
import { getUserDetails } from '@client/profile/profileSelectors'
import { ActGroupPicker } from './ActGroupPicker'
import { getModelLabel, useVisibleActGroups } from './actGroups'
import { useEventFormData } from './useEventFormData'
import { useEventFormNavigation } from './useEventFormNavigation'
import { useEvents } from './useEvents/useEvents'
import { useActionAnnotation } from './useActionAnnotation'

const messages = defineMessages({
  registerNewEventTitle: {
    id: 'register.selectVitalEvent.registerNewEventTitle',
    defaultMessage: 'New declaration',
    description: 'The title that appears on the select vital event page'
  },
  registerNewEventHeading: {
    id: 'register.selectVitalEvent.registerNewEventHeader',
    defaultMessage: 'What type of event do you want to declare?',
    description: 'The section heading on the page'
  },
  continueButton: {
    defaultMessage: 'Continue',
    description: 'Continue Button Text',
    id: 'buttons.continue'
  },
  errorMessage: {
    id: 'register.selectVitalEvent.errorMessage',
    defaultMessage: 'Please select the type of event',
    description: 'Error Message to show when no event is being selected'
  },
  backToHome: {
    id: 'v2.eventSelection.backToHome',
    defaultMessage: "Retour à l'accueil",
    description: "Bouton retour vers la page d'accueil"
  },
  exitButton: {
    defaultMessage: 'EXIT',
    description: 'Label for Exit button on EventTopBar',
    id: 'buttons.exit'
  }
})

const constantsMessages = defineMessages({
  skipToMainContent: {
    defaultMessage: 'Skip to main content',
    description:
      'Label for a keyboard accessibility link which skips to the main content',
    id: 'constants.skipToMainContent'
  }
})

function EventSelector() {
  const intl = useIntl()
  const navigate = useNavigate()
  const { closeActionView } = useEventFormNavigation()
  const [{ group: groupParam, backTo }] = useTypedSearchParams(
    ROUTES.V2.EVENTS.CREATE
  )
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(
    groupParam ?? null
  )
  const [eventType, setEventType] = useState('')
  const [noEventSelectedError, setNoEventSelectedError] = useState(false)
  const { visibleGroups, allowedEventConfigurations } = useVisibleActGroups()
  const events = useEvents()
  const clearForm = useEventFormData((state) => state.clear)
  const clearAnnotation = useActionAnnotation((state) => state.clear)
  const createEvent = events.createEvent()
  const user = useSelector(getUserDetails)

  const selectedGroup = visibleGroups.find(({ id }) => id === selectedGroupId)
  const modelOptions = (selectedGroup?.eventIds ?? [])
    .map((id) => allowedEventConfigurations.find((event) => event.id === id))
    .filter((event): event is (typeof allowedEventConfigurations)[number] =>
      Boolean(event)
    )

  function handleContinue() {
    if (eventType === '') {
      return setNoEventSelectedError(true)
    }
    const transactionId = createTemporaryId()
    const eventConfig = allowedEventConfigurations.find(
      ({ id }) => id === eventType
    )

    if (!eventConfig) {
      throw new Error(`Configuration for event '${eventType}' not found`)
    }

    createEvent.mutate({
      type: eventType,
      transactionId,
      createdAtLocation: user?.primaryOfficeId
    })

    clearForm()
    clearAnnotation()

    navigate(
      ROUTES.V2.EVENTS.DECLARE.buildPath({
        eventId: transactionId
      })
    )
  }

  // Étape 1 : grille d'icônes par acte d'état civil.
  if (!selectedGroup) {
    return (
      <ActGroupPicker
        groups={visibleGroups}
        onSelect={(groupId) => {
          const group = visibleGroups.find(({ id }) => id === groupId)
          // Si le groupe n'a qu'un seul modèle (ex: mariage/décès/divorce
          // tant que leurs variantes jugement/copie conforme n'existent
          // pas encore), on saute directement le sous-menu.
          if (group?.eventIds.length === 1) {
            setEventType(group.eventIds[0])
            setNoEventSelectedError(false)
          }
          setSelectedGroupId(groupId)
        }}
      />
    )
  }

  // Étape 2 : sous-menu des "modèles" pour l'acte choisi.
  return (
    <>
      {noEventSelectedError && (
        <ErrorText id="require-error">
          {intl.formatMessage(messages.errorMessage)}
        </ErrorText>
      )}
      <Stack alignItems="left" direction="column" gap={16}>
        <Button
          id="back-to-home"
          size="small"
          type="tertiary"
          onClick={() => closeActionView(backTo)}
        >
          <Icon name="ArrowLeft" />
          {intl.formatMessage(messages.backToHome)}
        </Button>
        <RadioGroup
          name="eventType"
          options={modelOptions.map((event) => ({
            value: event.id,
            label: getModelLabel(intl, event)
          }))}
          size={RadioSize.LARGE}
          value={eventType}
          onChange={(val) => {
            setEventType(val)
            setNoEventSelectedError(false)
          }}
        />

        <Button
          key="select-vital-event-continue"
          fullWidth
          id="continue"
          size="large"
          type="primary"
          onClick={handleContinue}
        >
          {intl.formatMessage(messages.continueButton)}
        </Button>
      </Stack>
    </>
  )
}

export function EventSelection() {
  const intl = useIntl()
  const { closeActionView } = useEventFormNavigation()
  const [{ backTo }] = useTypedSearchParams(ROUTES.V2.EVENTS.CREATE)

  return (
    <Frame
      header={
        <AppBar
          desktopLeft={<Icon name="Draft" size="large" />}
          desktopRight={
            <Button
              id="goBack"
              size="small"
              type="secondary"
              onClick={() => closeActionView(backTo)}
            >
              <Icon name="X" />
              {intl.formatMessage(messages.exitButton)}
            </Button>
          }
          desktopTitle={intl.formatMessage(messages.registerNewEventTitle)}
          mobileLeft={<Icon name="Draft" size="large" />}
          mobileRight={
            <Button
              size="medium"
              type="icon"
              onClick={() => closeActionView(backTo)}
            >
              <Icon name="X" />
            </Button>
          }
          mobileTitle={intl.formatMessage(messages.registerNewEventTitle)}
        />
      }
      skipToContentText={intl.formatMessage(
        constantsMessages.skipToMainContent
      )}
    >
      <Content
        size={ContentSize.SMALL}
        title={intl.formatMessage(messages.registerNewEventHeading)}
      >
        <React.Suspense
          fallback={<SuspenseLoadingFallback id="event-selector-spinner" />}
        >
          <EventSelector />
        </React.Suspense>
      </Content>
    </Frame>
  )
}
