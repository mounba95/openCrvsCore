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
  fetchLegalAgeSettings,
  LegalAgeSettings,
  updateLegalAgeSettings
} from './legalAgeSettingsApi'

const QUERY_KEY = ['legal-age-settings'] as const

export function useLegalAgeSettings() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchLegalAgeSettings
  })
}

export function useUpdateLegalAgeSettings() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (input: LegalAgeSettings) => updateLegalAgeSettings(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY })
  })

  return {
    updateSettings: mutation.mutateAsync,
    isMutating: mutation.isPending
  }
}
