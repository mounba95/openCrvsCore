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
/* eslint-disable max-lines */
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { Kysely } from 'kysely'
import {
  CreateUserInput,
  CreateUserInputInternal,
  UserName,
  TokenUserType,
  TriggerEvent,
  UUID,
  UpdateUserInput,
  User,
  UserOrSystem,
  isUUID,
  logger,
  triggerUserEventNotification
} from '@opencrvs/commons'
import { env } from '@events/environment'
import {
  getSystemByLegacyId,
  getSystemClientById
} from '@events/storage/postgres/events/system-clients'
import {
  getUserById,
  getUsersAndSystemsByIds,
  createUserWithCredentials,
  searchUsersWithInput,
  searchAllUsersWithInput,
  activateUserWithCredentials,
  updateUserById,
  isUsernameTaken,
  getUserCredentialsByUserId,
  SecurityQuestion,
  getUserByMobileOrEmail,
  resetUserCredentialsAndStatus,
  getUserByIdInTrx,
  updateUserByIdInTrx,
  updateUsernameByIdInTrx,
  setUserOfficesInTrx
} from '@events/storage/postgres/events/users'
import { generateSaltedHash, generateHash } from '@events/service/auth/hash'
import { updatePasswordHashAndSalt } from '@events/storage/postgres/events/users'
import * as draftsRepo from '@events/storage/postgres/events/drafts'
import { getClient } from '@events/storage/postgres/events'
import Schema from '@events/storage/postgres/events/schema/Database'
import { getRoles } from '../config/config'
import {
  generateRandomPassword,
  generateUsername,
  mapDbUserToUser
} from './utils'

export type UserSortBy =
  | 'createdAt'
  | 'firstname'
  | 'surname'
  | 'username'
  | 'email'
  | 'status'
  | 'role'

export type SearchUsersPayload = {
  username?: string
  mobile?: string
  email?: string
  status?: string
  primaryOfficeId?: UUID
  administrativeAreaId?: UUID
  locationId?: UUID
  count: number
  skip: number
  sortBy: UserSortBy
  sortOrder: 'asc' | 'desc'
}

async function findAvailableUsername(
  newUsername: string,
  existingUsername?: string,
  i = 0
): Promise<string> {
  const candidate = i === 0 ? newUsername : `${newUsername}${i}`
  if (existingUsername && existingUsername === candidate) {
    return candidate
  }

  const taken = await isUsernameTaken(candidate)
  return taken
    ? findAvailableUsername(newUsername, existingUsername, i + 1)
    : candidate
}

export async function getUser(
  userId: string
): Promise<User & { username: string }> {
  const user = await getUserById(UUID.parse(userId))

  if (!user) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: `User not found: ${userId}`
    })
  }

  return mapDbUserToUser(user)
}

export async function findUserOrSystem(
  id: UUID
): Promise<UserOrSystem | undefined> {
  try {
    return await getUser(id)
  } catch (e) {
    logger.info(
      `No user found for id: ${id}. Will look for a system instead. Error: ${e instanceof Error ? e.message : String(e)}`
    )
  }

  try {
    const system = isUUID(id)
      ? await getSystemClientById(id)
      : await getSystemByLegacyId(id)

    return {
      type: TokenUserType.enum.system,
      id,
      legacyId: system.legacyId ? system.legacyId : undefined,
      name: system.name
    }
  } catch (e) {
    logger.info(
      `No system found for id: ${id}. User/system has probably been removed. Will return undefined. Error: ${e instanceof Error ? e.message : String(e)}`
    )
  }

  return
}

export async function searchUsers(
  payload: SearchUsersPayload
): Promise<User[]> {
  const results = await searchUsersWithInput(payload)

  return results.map(mapDbUserToUser)
}

export async function searchUsersAll(
  payload: Omit<SearchUsersPayload, 'skip' | 'count'>
): Promise<User[]> {
  const results = await searchAllUsersWithInput(payload)
  return results.map(mapDbUserToUser)
}

async function handleUsernameUpdate(
  trx: Kysely<Schema>,
  {
    userId,
    oldUsername,
    incomingName,
    input,
    token
  }: {
    userId: UUID
    oldUsername: string
    incomingName: UserName
    input: Pick<UpdateUserInput, 'email' | 'mobile'>
    token: string
  }
) {
  const newUsernameCandidate = generateUsername(incomingName)

  if (newUsernameCandidate === oldUsername) {
    return
  }

  const newUsername = await findAvailableUsername(
    newUsernameCandidate,
    oldUsername
  )

  await updateUsernameByIdInTrx(trx, userId, newUsername)

  await triggerUserEventNotification({
    event: 'user-updated',
    payload: {
      recipient: {
        name: incomingName,
        email: input.email,
        mobile: input.mobile
      },
      oldUsername,
      newUsername
    },
    countryConfigUrl: env.COUNTRY_CONFIG_URL,
    authHeader: { Authorization: token }
  })
}

export async function updateUser(
  input: UpdateUserInput,
  token: string
): Promise<User> {
  const db = getClient()

  const {
    id: userId,
    name: incomingName,
    signature,
    primaryOfficeId: incomingOfficeId,
    officeIds: incomingOfficeIds,
    ...otherFields
  } = input

  const dbUser = await db.transaction().execute(async (trx) => {
    const existingUser = await getUserByIdInTrx(trx, userId)

    if (!existingUser) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `User not found: ${userId}`
      })
    }

    await updateUserByIdInTrx(trx, userId, {
      ...otherFields,
      firstname: incomingName?.firstname,
      surname: incomingName?.surname,
      signaturePath: signature?.path,
      officeId: incomingOfficeId
    })

    if (incomingOfficeId && incomingOfficeId !== existingUser.officeId) {
      await draftsRepo.deleteDraftsByUserIdInTrx(trx, userId)
    }

    if (incomingOfficeIds) {
      // Niger : la commune principale fait toujours partie des communes affectées.
      const officeIds = [
        ...new Set([
          incomingOfficeId ?? existingUser.officeId,
          ...incomingOfficeIds
        ])
      ]
      await setUserOfficesInTrx(trx, userId, officeIds)
    }

    if (incomingName) {
      await handleUsernameUpdate(trx, {
        userId,
        incomingName,
        oldUsername: existingUser.username,
        input,
        token
      })
    }

    return getUserByIdInTrx(trx, userId)
  })

  if (!dbUser) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'User updated does not exist'
    })
  }

  return mapDbUserToUser(dbUser)
}

async function sendCredentialsNotification(
  event: typeof TriggerEvent.USER_CREATED | typeof TriggerEvent.RESEND_INVITE,
  name: UserName,
  username: string,
  password: string,
  token: string,
  msisdn?: string,
  email?: string
) {
  try {
    await triggerUserEventNotification({
      event,
      payload: {
        recipient: {
          name,
          email,
          mobile: msisdn
        },
        username,
        temporaryPassword: password
      },
      countryConfigUrl: env.COUNTRY_CONFIG_URL,
      authHeader: { Authorization: token }
    })
  } catch (err) {
    logger.error(`Unable to send ${event} notification for error : ${err}`)
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Unable to send notification to for error : ${err}`
    })
  }
}

export const ResolvedCreateUserInput = CreateUserInput.extend({
  ...CreateUserInputInternal.shape,
  // Ensure defaults are resolved.
  password: z.string(),
  username: z.string(),
  status: z.enum(['active', 'pending'])
})
export type ResolvedCreateUserInput = z.infer<typeof ResolvedCreateUserInput>

/**
 * Niger : le mot de passe est désormais toujours fourni directement par
 * l'administrateur (`CreateUserInput.password`, saisi avec confirmation
 * côté client) — un utilisateur créé ainsi est donc actif immédiatement,
 * sans mot de passe temporaire ni notification d'activation. Le seul cas
 * restant sans mot de passe fourni est le flux interne de seed
 * (`CreateUserInputInternal`, `initialisationRouter`), qui garde son
 * comportement `pending` existant.
 */
function resolveCreateUserInput(
  input: CreateUserInput | CreateUserInputInternal
): ResolvedCreateUserInput {
  const password =
    (input as CreateUserInputInternal).password ??
    env.DEFAULT_USER_PASSWORD ??
    generateRandomPassword()
  return ResolvedCreateUserInput.parse({
    ...input,
    password,
    status:
      (input as CreateUserInputInternal).status ??
      ((input as CreateUserInputInternal).password ? 'active' : 'pending')
  })
}

export async function createUser(
  input: CreateUserInput | CreateUserInputInternal,
  _token: string
) {
  const usernameCandidate = input.username ?? generateUsername(input.name)
  const username = await findAvailableUsername(usernameCandidate)
  const resolvedUser = resolveCreateUserInput({ ...input, username })

  const userPayload = {
    firstname: resolvedUser.name.firstname,
    surname: resolvedUser.name.surname,
    // Normalise to undefined for the same reason as mobile above.
    email: resolvedUser.email?.toLowerCase() || undefined,
    fullHonorificName: resolvedUser.fullHonorificName,
    role: resolvedUser.role,
    device: resolvedUser.device,
    officeId: resolvedUser.primaryOfficeId,
    // Normalise to undefined — PostgreSQL's unique constraint treats "" as a
    // duplicate, so any empty string must be stored as NULL instead.
    mobile: resolvedUser.mobile || undefined,
    status: resolvedUser.status,
    signaturePath: resolvedUser.signature?.path,
    data: resolvedUser.data ?? {}
  }

  // Hash the provided password, or generate a random placeholder for pending
  // users who will set their own password via the activation flow.
  const { hash, salt } = await generateSaltedHash(resolvedUser.password)
  const userCredentialPayload = {
    username: resolvedUser.username,
    passwordHash: hash,
    salt,
    securityQuestions: []
  }

  // Niger : un mot de passe fourni directement (status 'active') ne
  // nécessite aucune notification — l'administrateur le communique lui-même
  // à l'agent. Seul le flux 'pending' historique (mot de passe temporaire
  // généré) a besoin d'être notifié.
  if (resolvedUser.status === 'pending') {
    await sendCredentialsNotification(
      TriggerEvent.USER_CREATED,
      input.name,
      userCredentialPayload.username,
      resolvedUser.password,
      _token,
      userPayload.mobile ?? undefined,
      userPayload.email
    )
  }

  // Niger : la commune principale fait toujours partie des communes affectées.
  const officeIds = [
    ...new Set([resolvedUser.primaryOfficeId, ...(resolvedUser.officeIds ?? [])])
  ]

  const postgresId = await createUserWithCredentials(
    userPayload,
    userCredentialPayload,
    officeIds
  )

  return getUser(postgresId)
}

export async function activateUser(input: {
  userId: UUID
  password: string
  securityQNAs: { questionKey: string; answer: string }[]
}): Promise<void> {
  const { hash, salt } = await generateSaltedHash(input.password)

  const securityQuestions = await Promise.all(
    input.securityQNAs.map(async (qna) => ({
      questionKey: qna.questionKey,
      answerHash: await generateHash(qna.answer.toLowerCase(), salt)
    }))
  )

  const userId = UUID.parse(input.userId)
  await activateUserWithCredentials(userId, hash, salt, securityQuestions)
}

export async function resendInvite(userId: UUID, token: string): Promise<void> {
  const user = await getUserById(userId)

  if (!user) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: `User not found: ${userId}`
    })
  }

  if (user.status !== 'pending') {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Can only resend invite to a user in pending status'
    })
  }

  const password = env.DEFAULT_USER_PASSWORD ?? generateRandomPassword()
  const { hash, salt } = await generateSaltedHash(password)

  const userName: UserName = {
    firstname: user.firstname,
    surname: user.surname
  }

  await sendCredentialsNotification(
    TriggerEvent.RESEND_INVITE,
    userName,
    user.username,
    password,
    token,
    user.mobile ?? undefined,
    user.email ?? undefined
  )

  await resetUserCredentialsAndStatus(userId, hash, salt)
}

/**
 * Retrieves multiple users/systems by their IDs.
 *
 * If no user or system is found for an id, we leave them out of the result.
 * This is because a user might have been removed, and we don't want to throw an error in those cases.
 *
 * @param ids - Array of ids, which can be normal user or system ids
 * @param token - Authorization token for API requests
 * @returns Array of found users. If no users are found for some ids, we leave them out of the result.
 */
export const getUsersById = async (ids: string[]): Promise<UserOrSystem[]> => {
  const { users, systems } = await getUsersAndSystemsByIds(ids)

  const mappedUsers: UserOrSystem[] = users.map(mapDbUserToUser)
  const mappedSystems: UserOrSystem[] = systems.map((s) => ({
    type: TokenUserType.enum.system,
    id: s.id,
    legacyId: s.legacyId ?? undefined,
    name: s.name
  }))

  return [...mappedUsers, ...mappedSystems]
}

export function isUser(userOrSystem: UserOrSystem): userOrSystem is User {
  return userOrSystem.type === TokenUserType.enum.user
}

export const getCredentials = async (userId: UUID) => {
  const credentials = await getUserCredentialsByUserId(userId)

  if (!credentials) {
    logger.error(`No user details found by given userid: ${userId}`)
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }

  return credentials
}

export const getSecurityQuestionsForUser = <
  T extends { securityQuestions: unknown }
>(
  record: T
): SecurityQuestion[] => {
  if (
    !Array.isArray(record.securityQuestions) ||
    record.securityQuestions.length === 0
  ) {
    throw new TRPCError({
      code: 'CONFLICT',
      message: "User doesn't have security questions"
    })
  }
  return record.securityQuestions
}

export async function checkSecurityQuestionMatch({
  questions,
  input,
  salt
}: {
  questions: { questionKey: string; answerHash: string }[]
  input: { questionKey: string; answer: string }
  salt: string
}) {
  const targetIndex = questions.findIndex(
    (q) => q.questionKey === input.questionKey
  )

  if (targetIndex === -1) {
    return {
      matched: false,
      questionKey: input.questionKey
    }
  }

  const hash = await generateHash(input.answer.toLowerCase(), salt)
  const matched = hash === questions[targetIndex].answerHash

  // Correct answer
  if (matched) {
    return { matched, questionKey: input.questionKey }
  }

  // On a wrong answer, rotate to the next question in the user's list (or wrap around at the end).
  let nextIndex = targetIndex + 1
  if (nextIndex >= questions.length) {
    nextIndex = 0
  }

  return { matched, questionKey: questions[nextIndex].questionKey }
}

export async function verifyPasswordById(
  id: UUID,
  password: string
): Promise<{ mobile?: string; status: string; username: string; id: string }> {
  const credentials = await getCredentials(id)

  const hash = await generateHash(password, credentials.salt)
  if (hash !== credentials.passwordHash) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }

  const user = await getUserById(id)
  if (!user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }

  return {
    mobile: user.mobile ?? undefined,
    status: user.status,
    username: user.username,
    id: user.id
  }
}

export async function verifyUser(input: { mobile?: string; email?: string }) {
  const user = await getUserByMobileOrEmail(
    input.mobile ? { mobile: input.mobile } : { email: input.email ?? '' }
  )

  if (!user) {
    // Don't reveal whether the account exists
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }

  const questions = getSecurityQuestionsForUser(user)

  const securityQuestionKey =
    questions[Math.floor(Math.random() * questions.length)].questionKey

  const roles = await getRoles()
  const scope = roles.find((r) => r.id === user.role)?.scopes ?? []

  return {
    id: user.id,
    username: user.username,
    mobile: user.mobile ?? undefined,
    email: user.email ?? undefined,
    status: user.status,
    name: {
      firstname: user.firstname,
      surname: user.surname
    },
    securityQuestionKey,
    scope
  }
}

/**
 * Niger : l'administrateur définit désormais le nouveau mot de passe
 * directement (avec confirmation côté client), plutôt qu'un mot de passe
 * temporaire généré et notifié par e-mail/SMS — aucune notification n'est
 * envoyée, et le compte reste/devient 'active' (jamais repoussé en
 * 'pending', l'administrateur communique lui-même le mot de passe à
 * l'agent).
 */
export async function resetPasswordByAdmin(
  userId: UUID,
  password: string
): Promise<void> {
  // Throws NOT_FOUND if the user doesn't exist.
  await getUser(userId)

  const { hash, salt } = await generateSaltedHash(password)
  await updatePasswordHashAndSalt(userId, hash, salt)
  await updateUserById(userId, { status: 'active' })
}

export async function sendUsernameReminder(
  userId: UUID,
  token: string
): Promise<void> {
  const user = await getUser(userId)

  try {
    await triggerUserEventNotification({
      event: 'username-reminder',
      payload: {
        recipient: {
          name: user.name,
          email: user.email,
          mobile: user.mobile
        },
        username: user.username
      },
      countryConfigUrl: env.COUNTRY_CONFIG_URL,
      authHeader: { Authorization: token }
    })
  } catch (err) {
    logger.error(
      `Unable to send username reminder notification for error: ${err}`
    )
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Unable to send notification: ${err}`
    })
  }
}
