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
import { defineMessages, MessageDescriptor } from 'react-intl'

interface ILoginFooterMessages
  extends Record<string | number | symbol, MessageDescriptor> {
  version: MessageDescriptor
  copyright: MessageDescriptor
}

const messagesToDefine: ILoginFooterMessages = {
  version: {
    id: 'login.footerVersion',
    defaultMessage: 'VERSION {version}',
    description: 'Version label shown in the login page footer'
  },
  copyright: {
    id: 'login.footerCopyright',
    defaultMessage: '© 2009–{currentYear} by {appName}. All rights reserved',
    description: 'Copyright notice shown in the login page footer'
  }
}

export const messages: ILoginFooterMessages = defineMessages(messagesToDefine)
