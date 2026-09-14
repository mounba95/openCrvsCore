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

import { TRPCError } from '@trpc/server'
import { sql } from 'kysely'
import { getUUID, encodeScope } from '@opencrvs/commons'
import { UUID } from '@opencrvs/commons/events'
import { createTestClient, setupTestCase } from '@events/tests/utils'
import { getUserCredentialsByUserId } from '@events/storage/postgres/events/users'

const USER_EDIT_SCOPE = encodeScope({ type: 'user.edit' })

// Niger : le mot de passe est désormais fourni directement par
// l'administrateur (avec confirmation côté client) — plus de mot de passe
// temporaire généré/notifié par e-mail/SMS. Voir CONTEXTE-PROJET.md.
const NEW_PASSWORD = 'ValidTestPassw0rd1'

test('sendResetPasswordInvite throws NOT_FOUND when user does not exist', async () => {
  const { user } = await setupTestCase()
  const nonExistentUserId = getUUID()

  const client = createTestClient(user, [USER_EDIT_SCOPE])

  await expect(
    client.user.sendResetPasswordInvite({
      userId: nonExistentUserId,
      password: NEW_PASSWORD
    })
  ).rejects.toMatchObject({ code: 'NOT_FOUND' })
})

test('sendResetPasswordInvite sets the user active and records audit log', async () => {
  const { eventsDb, user, users } = await setupTestCase()
  const targetUser = users[1]

  const client = createTestClient(user, [USER_EDIT_SCOPE])

  await client.user.sendResetPasswordInvite({
    userId: targetUser.id,
    password: NEW_PASSWORD
  })

  const auditEntry = await eventsDb
    .selectFrom('auditLog')
    .selectAll()
    .where('operation', '=', 'user.password_reset_by_admin')
    .where(sql`request_data->>'subjectId'`, '=', targetUser.id)
    .executeTakeFirst()

  expect(auditEntry).toBeDefined()
  expect(auditEntry?.operation).toBe('user.password_reset_by_admin')

  const updatedUser = await client.user.get(targetUser.id)
  expect(updatedUser.status).toBe('active')
})

test('sendResetPasswordInvite updates the password hash in the database', async () => {
  const { user, users } = await setupTestCase()
  const targetUser = users[1]

  const credentialsBefore = await getUserCredentialsByUserId(
    targetUser.id as UUID
  )

  const client = createTestClient(user, [USER_EDIT_SCOPE])
  await client.user.sendResetPasswordInvite({
    userId: targetUser.id,
    password: NEW_PASSWORD
  })

  const credentialsAfter = await getUserCredentialsByUserId(
    targetUser.id as UUID
  )

  expect(credentialsAfter?.passwordHash).not.toBe(
    credentialsBefore?.passwordHash
  )
  expect(credentialsAfter?.salt).not.toBe(credentialsBefore?.salt)
})

test('sendResetPasswordInvite requires user.edit scope', async () => {
  const { user, users } = await setupTestCase()
  const targetUser = users[1]

  const limitedClient = createTestClient(user, [])

  await expect(
    limitedClient.user.sendResetPasswordInvite({
      userId: targetUser.id,
      password: NEW_PASSWORD
    })
  ).rejects.toMatchObject(new TRPCError({ code: 'FORBIDDEN' }))
})
