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
import { useIntl } from 'react-intl'
import styled from 'styled-components'
import { PageConfig } from '@opencrvs/commons/client'
import { Icon } from '@opencrvs/components/src/Icon'

const List = styled.ol`
  display: flex;
  flex-direction: column;
  list-style: none;
  margin: 0;
  padding: 0;
  width: 220px;

  @media (max-width: ${({ theme }) => theme.grid.breakpoints.md}px) {
    display: none;
  }
`

const Item = styled.li`
  position: relative;
  padding-bottom: 24px;

  &:not(:last-child)::before {
    content: '';
    position: absolute;
    left: 13px;
    top: 28px;
    bottom: 0;
    width: 2px;
    background: ${({ theme }) => theme.colors.grey200};
  }
`

const StepButton = styled.button<{ $clickable: boolean }>`
  all: unset;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};
`

const Circle = styled.span<{ $state: 'done' | 'current' | 'upcoming' }>`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  ${({ theme }) => theme.fonts.bold14};
  background: ${({ $state, theme }) =>
    $state === 'upcoming' ? theme.colors.grey100 : theme.colors.brandGreen};
  color: ${({ $state, theme }) =>
    $state === 'upcoming' ? theme.colors.grey500 : theme.colors.white};
  border: 2px solid
    ${({ $state, theme }) =>
      $state === 'current' ? theme.colors.brandGreenDark : 'transparent'};
`

const Label = styled.span<{ $current: boolean; $reachable: boolean }>`
  ${({ theme, $current }) =>
    $current ? theme.fonts.bold14 : theme.fonts.reg14};
  color: ${({ theme, $reachable }) =>
    $reachable ? theme.colors.copy : theme.colors.grey400};
  padding-top: 4px;
  text-align: left;
`

type StepState = 'done' | 'current' | 'upcoming'

function getStepState(index: number, currentPageIndex: number): StepState {
  if (index === currentPageIndex) {
    return 'current'
  }
  return index < currentPageIndex ? 'done' : 'upcoming'
}

/**
 * Vertical numbered step list shown alongside a multi-page form (declare,
 * edit...), letting the user jump directly to any page they have already
 * reached instead of only going one page forward/back at a time.
 */
export function FormStepList({
  pages,
  currentPageIndex,
  highestVisitedIndex,
  onSelect
}: {
  pages: PageConfig[]
  currentPageIndex: number
  highestVisitedIndex: number
  onSelect: (pageId: string) => void
}) {
  const intl = useIntl()

  if (pages.length < 2) {
    return null
  }

  return (
    <List>
      {pages.map((page, index) => {
        const reachable = index <= highestVisitedIndex
        const clickable = reachable && index !== currentPageIndex
        const state = getStepState(index, currentPageIndex)

        return (
          <Item key={page.id}>
            <StepButton
              $clickable={clickable}
              disabled={!clickable}
              type="button"
              onClick={() => clickable && onSelect(page.id)}
            >
              <Circle $state={state}>
                {state === 'done' ? (
                  <Icon color="white" name="Check" size="small" />
                ) : (
                  index + 1
                )}
              </Circle>
              <Label $current={index === currentPageIndex} $reachable={reachable}>
                {intl.formatMessage(page.title)}
              </Label>
            </StepButton>
          </Item>
        )
      })}
    </List>
  )
}
