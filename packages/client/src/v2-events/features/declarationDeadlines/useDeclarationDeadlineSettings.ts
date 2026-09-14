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
  fetchDeclarationDeadlineSettings,
  updateCommuneUrgenceStatus,
  updateDeclarationDeadlineSettings
} from './declarationDeadlinesApi'

const QUERY_KEY = ['declaration-deadline-settings'] as const

/**
 * Niger : lecture des délais légaux de déclaration — utilisé à la fois par
 * l'écran d'administration (édition) et par le blocage de la déclaration
 * (`actions/declare/Pages.tsx`), toujours à jour sans redémarrage serveur
 * puisque récupéré en direct par le client (voir CONTEXTE-PROJET.md, plan
 * "Délais légaux de déclaration configurables").
 */
export function useDeclarationDeadlineSettings() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchDeclarationDeadlineSettings
  })
}

export function useUpdateDeclarationDeadlineSettings() {
  const queryClient = useQueryClient()
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: QUERY_KEY })

  const updateSettingsMutation = useMutation({
    mutationFn: updateDeclarationDeadlineSettings,
    onSuccess: invalidate
  })

  const updateCommuneMutation = useMutation({
    mutationFn: updateCommuneUrgenceStatus,
    onSuccess: invalidate
  })

  return {
    updateSettings: updateSettingsMutation.mutateAsync,
    updateCommuneUrgence: updateCommuneMutation.mutateAsync,
    isMutating: updateSettingsMutation.isPending || updateCommuneMutation.isPending
  }
}
