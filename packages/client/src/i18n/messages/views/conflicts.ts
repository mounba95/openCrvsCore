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

interface IAssignmentMessages
  extends Record<string | number | symbol, MessageDescriptor> {
  regUnassignDesc: MessageDescriptor
  unassignTitle: MessageDescriptor
}

const messagesToDefine: IAssignmentMessages = {
  regUnassignDesc: {
    defaultMessage:
      '{name} at {officeName} currently has sole editable access to this record. Unassigning this record will mean their current edits will be lost. Please confirm you wish to continue.',
    id: 'conflicts.modal.regUnassign.description',
    description:
      'Description for modal when registrar wants to unassign an assigned user'
  },
  unassignTitle: {
    defaultMessage: 'Unassign record?',
    id: 'conflicts.modal.unassign.title',
    description: 'Title for modal when unassign record'
  }
}

export const conflictsMessages: IAssignmentMessages =
  defineMessages(messagesToDefine)
