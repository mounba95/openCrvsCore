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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  closeRegister,
  deleteRegister,
  fetchRegisters,
  openRegister,
  RegisterEventType,
  reopenRegister,
  reserveNumbers
} from './registersApi'

export function useRegisters(officeId: string | undefined) {
  const queryClient = useQueryClient()
  const queryKey = ['registers', officeId] as const

  const registersQuery = useQuery({
    queryKey,
    queryFn: () => fetchRegisters(officeId as string),
    enabled: Boolean(officeId)
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey })

  const openMutation = useMutation({
    mutationFn: (input: {
      eventType: RegisterEventType
      year: number
      initialNumber?: number
    }) => openRegister({ officeId: officeId as string, ...input }),
    onSuccess: invalidate
  })

  const closeMutation = useMutation({
    mutationFn: (input: { eventType: RegisterEventType; year: number }) =>
      closeRegister({ officeId: officeId as string, ...input }),
    onSuccess: invalidate
  })

  const reopenMutation = useMutation({
    mutationFn: (input: { eventType: RegisterEventType; year: number }) =>
      reopenRegister({ officeId: officeId as string, ...input }),
    onSuccess: invalidate
  })

  const deleteMutation = useMutation({
    mutationFn: (input: { eventType: RegisterEventType; year: number }) =>
      deleteRegister({ officeId: officeId as string, ...input }),
    onSuccess: invalidate
  })

  const reserveMutation = useMutation({
    mutationFn: (input: {
      eventType: RegisterEventType
      year: number
      upToNumber: number
    }) => reserveNumbers({ officeId: officeId as string, ...input }),
    onSuccess: invalidate
  })

  return {
    registers: registersQuery.data ?? [],
    isLoading: registersQuery.isLoading,
    error: registersQuery.error,
    openRegister: openMutation.mutateAsync,
    closeRegister: closeMutation.mutateAsync,
    reopenRegister: reopenMutation.mutateAsync,
    deleteRegister: deleteMutation.mutateAsync,
    reserveNumbers: reserveMutation.mutateAsync,
    isMutating:
      openMutation.isPending ||
      closeMutation.isPending ||
      reopenMutation.isPending ||
      deleteMutation.isPending ||
      reserveMutation.isPending
  }
}
