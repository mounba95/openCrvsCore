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

import styled from 'styled-components'
import { Box } from '@opencrvs/components/lib/Box'
import { Button } from '@opencrvs/components/lib/Button'
import { Text } from '@opencrvs/components/lib/Text/Text'
import {
  LOGIN_BRAND_GREEN,
  LOGIN_BRAND_GREEN_DARK
} from '@login/common/loginBrandTheme'

export const FormWrapper = styled.form`
  width: 100%;
  padding: 6px 0;

  /* Keep the glass effect going through the inputs too, instead of solid
     white boxes standing out against the translucent LoginCard behind them.
     Bolder text compensates for the legibility loss from that transparency
     plus the backdrop blur, and a shorter fixed input height keeps the
     overall form compact. */
  input {
    background: rgba(255, 255, 255, 0.35) !important;
    height: 34px !important;
    font-weight: 700;
  }

  label {
    font-weight: 700;
    margin-bottom: 2px !important;
  }
`

export const LogoContainer = styled.div`
  flex-direction: row;
  display: flex;
  justify-content: center;
  @media (max-width: ${({ theme }) => theme.grid.breakpoints.lg}px) {
    & svg {
      transform: scale(0.8);
    }
  }
`

export const Container = styled.div`
  position: relative;
  height: auto;
  margin: auto;
  width: min(380px, 90%);
`

// Compact variant of Container, sized down to fit inside the smaller
// bounded Niger login widget card rather than a full-viewport page. Kept
// wide rather than narrow, so the card reads as a balanced rectangle instead
// of a tall vertical strip.
export const CompactContainer = styled.div`
  position: relative;
  height: auto;
  margin: auto;
  width: min(400px, 85%);
`

// Niger (DGECM-R) login card styling — additive exports, existing ones above
// are untouched and still used as-is (e.g. LogoContainer in StepTwoContainer).
export const LoginCard = styled(Box)`
  background: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(1.5px);
  -webkit-backdrop-filter: blur(1.5px);
  && {
    border-radius: 10px;
    border: none;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
    padding: 10px 22px;
  }
`

export const CardHeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 4px;
  margin-bottom: 4px;
  border-bottom: 2px solid ${LOGIN_BRAND_GREEN};
`

export const CardTitle = styled(Text).attrs({
  variant: 'h4',
  element: 'h1'
})`
  color: ${LOGIN_BRAND_GREEN_DARK};
  text-transform: uppercase;
  font-weight: 700;
`

export const GreenButton = styled(Button)`
  && {
    background: ${LOGIN_BRAND_GREEN} !important;
    border-radius: 8px;
  }
  &&:hover:not(:disabled) {
    background: ${LOGIN_BRAND_GREEN_DARK} !important;
  }
`
