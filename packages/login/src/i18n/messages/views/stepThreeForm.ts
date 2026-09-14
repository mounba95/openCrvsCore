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
import { MessageDescriptor, defineMessages } from 'react-intl'

interface IStepThreeFormMessages
  extends Record<string | number | symbol, MessageDescriptor> {
  stepThreeTitle: MessageDescriptor
  stepThreeInstruction: MessageDescriptor
  officeLabel: MessageDescriptor
  continueButton: MessageDescriptor
}

const messagesToDefine: IStepThreeFormMessages = {
  stepThreeTitle: {
    id: 'login.stepThreeTitle',
    defaultMessage: 'Choose your office',
    description: 'The title that appears in step three of the form'
  },
  stepThreeInstruction: {
    id: 'login.stepThreeInstruction',
    defaultMessage:
      'You are assigned to several offices. Choose which one you want to work in for this session — you can change it later from Settings.',
    description: 'The instruction that appears in step three of the form'
  },
  officeLabel: {
    id: 'login.stepThreeOfficeLabel',
    defaultMessage: 'Office',
    description: 'Label for the office selection dropdown'
  },
  continueButton: {
    id: 'login.stepThreeContinue',
    defaultMessage: 'Continue',
    description: 'The label that appears on the continue button'
  }
}

export const messages: IStepThreeFormMessages = defineMessages(messagesToDefine)
