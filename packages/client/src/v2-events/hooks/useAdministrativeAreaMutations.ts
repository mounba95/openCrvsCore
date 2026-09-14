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
import { useMutation } from '@tanstack/react-query'
import { AdministrativeArea, Location, UUID } from '@opencrvs/commons/client'
import { queryClient, useTRPC } from '@client/v2-events/trpc'

/**
 * Niger : découpage administratif éditable (créer une région/un département/
 * une commune, ériger une zone d'un niveau à l'autre, créer un bureau
 * d'état civil) — voir plan "Découpage administratif éditable"
 * (CONTEXTE-PROJET.md). S'appuie sur les mutations tRPC déjà existantes côté
 * serveur events (`administrativeAreas.set`/`locations.set`, upserts
 * idempotents protégés par les scopes `user.data-seeding`/
 * `config.update-all`) — rien de nouveau côté serveur, uniquement ces
 * hooks + l'écran d'administration (`AdministrativeLevels.tsx`).
 *
 * `AdministrativeArea.parentId: null` = sommet de l'arbre (région) — il n'y
 * a pas de champ "niveau" figé dans le schéma, donc "ériger" une zone d'un
 * niveau à l'autre est littéralement un changement de `parentId` vers le
 * grand-parent actuel (ou `null` pour passer département → région).
 *
 * Le cache client de `useLocations`/`useAdministrativeAreas` garde les
 * données 24h (`staleTime`) — chaque mutation invalide donc explicitement
 * les requêtes `locations.list`/`administrativeAreas.list` pour que le
 * changement soit visible immédiatement dans la même session, sans
 * redémarrage ni attente.
 */

function useInvalidateLocationQueries() {
  const trpc = useTRPC()
  return async () => {
    await queryClient.invalidateQueries({
      queryKey: trpc.administrativeAreas.list.queryKey()
    })
    await queryClient.invalidateQueries({
      queryKey: trpc.locations.list.queryKey()
    })
  }
}

export function useCreateAdministrativeArea() {
  const trpc = useTRPC()
  const invalidate = useInvalidateLocationQueries()
  const mutationOptions = trpc.administrativeAreas.set.mutationOptions()

  const mutation = useMutation({
    ...mutationOptions,
    onSuccess: async (data, variables, context) => {
      await invalidate()
      await mutationOptions.onSuccess?.(data, variables, context)
    }
  })

  return {
    createAdministrativeArea: (input: { name: string; parentId: UUID | null }) => {
      const area: AdministrativeArea = {
        id: crypto.randomUUID() as UUID,
        name: input.name,
        parentId: input.parentId,
        externalId: null,
        validUntil: null
      }
      return mutation.mutateAsync([area]).then(() => area)
    },
    isPending: mutation.isPending
  }
}

export function useCreateOffice() {
  const trpc = useTRPC()
  const invalidate = useInvalidateLocationQueries()
  const mutationOptions = trpc.locations.set.mutationOptions()

  const mutation = useMutation({
    ...mutationOptions,
    onSuccess: async (data, variables, context) => {
      await invalidate()
      await mutationOptions.onSuccess?.(data, variables, context)
    }
  })

  return {
    createOffice: (input: { name: string; administrativeAreaId: UUID }) => {
      const office: Location = {
        id: crypto.randomUUID() as UUID,
        name: input.name,
        administrativeAreaId: input.administrativeAreaId,
        locationType: 'CRVS_OFFICE',
        externalId: null,
        validUntil: null
      }
      return mutation.mutateAsync([office]).then(() => office)
    },
    isPending: mutation.isPending
  }
}

/**
 * Niger : formations sanitaires ("CSI Tanda", "CS Tanda", "HD Tanda"...) —
 * même mutation `locations.set` que les bureaux, mais avec
 * `locationType: 'HEALTH_FACILITY'` et un `fullName` (nom complet officiel
 * imprimé sur les actes, ex: "Centre de Santé Intégré de Tanda") en plus du
 * `name` abrégé affiché dans les listes déroulantes de recherche.
 */
export function useCreateHealthFacility() {
  const trpc = useTRPC()
  const invalidate = useInvalidateLocationQueries()
  const mutationOptions = trpc.locations.set.mutationOptions()

  const mutation = useMutation({
    ...mutationOptions,
    onSuccess: async (data, variables, context) => {
      await invalidate()
      await mutationOptions.onSuccess?.(data, variables, context)
    }
  })

  return {
    createHealthFacility: (input: {
      name: string
      fullName: string
      administrativeAreaId: UUID
    }) => {
      const facility: Location = {
        id: crypto.randomUUID() as UUID,
        name: input.name,
        fullName: input.fullName,
        administrativeAreaId: input.administrativeAreaId,
        locationType: 'HEALTH_FACILITY',
        externalId: null,
        validUntil: null
      }
      return mutation.mutateAsync([facility]).then(() => facility)
    },
    isPending: mutation.isPending
  }
}

export function usePromoteAdministrativeArea() {
  const trpc = useTRPC()
  const invalidate = useInvalidateLocationQueries()
  const mutationOptions = trpc.administrativeAreas.set.mutationOptions()

  const mutation = useMutation({
    ...mutationOptions,
    onSuccess: async (data, variables, context) => {
      await invalidate()
      await mutationOptions.onSuccess?.(data, variables, context)
    }
  })

  return {
    promoteAdministrativeArea: (
      area: AdministrativeArea,
      newParentId: UUID | null
    ) => mutation.mutateAsync([{ ...area, parentId: newParentId }]),
    isPending: mutation.isPending
  }
}

/**
 * Niger : suppression — le schéma n'a pas de suppression dure (voir
 * recherche du plan "Découpage administratif éditable"), seulement une
 * désactivation via `validUntil`. Une fois désactivée, la zone/l'office
 * disparaît de la liste (le filtre existant dans `AdministrativeLevels.tsx`
 * exclut déjà tout `validUntil` passé) sans jamais toucher l'historique des
 * actes déjà enregistrés dessous.
 */
export function useDeleteAdministrativeArea() {
  const trpc = useTRPC()
  const invalidate = useInvalidateLocationQueries()
  const mutationOptions = trpc.administrativeAreas.set.mutationOptions()

  const mutation = useMutation({
    ...mutationOptions,
    onSuccess: async (data, variables, context) => {
      await invalidate()
      await mutationOptions.onSuccess?.(data, variables, context)
    }
  })

  return {
    deleteAdministrativeArea: (area: AdministrativeArea) =>
      mutation.mutateAsync([
        { ...area, validUntil: new Date().toISOString() }
      ]),
    isPending: mutation.isPending
  }
}

export function useDeleteOffice() {
  const trpc = useTRPC()
  const invalidate = useInvalidateLocationQueries()
  const mutationOptions = trpc.locations.set.mutationOptions()

  const mutation = useMutation({
    ...mutationOptions,
    onSuccess: async (data, variables, context) => {
      await invalidate()
      await mutationOptions.onSuccess?.(data, variables, context)
    }
  })

  return {
    deleteOffice: (office: Location) =>
      mutation.mutateAsync([
        { ...office, validUntil: new Date().toISOString() }
      ]),
    isPending: mutation.isPending
  }
}

/**
 * Niger : "créer une commune" crée toujours dans la foulée son bureau
 * d'état civil (même nom) — geste unique côté utilisateur, voir demande
 * d'origine ("si on crée une commune il faut créer le office").
 */
export function useCreateCommuneWithOffice() {
  const { createAdministrativeArea } = useCreateAdministrativeArea()
  const { createOffice } = useCreateOffice()

  return {
    createCommuneWithOffice: async (input: {
      name: string
      parentId: UUID
    }) => {
      const commune = await createAdministrativeArea(input)
      await createOffice({
        name: input.name,
        administrativeAreaId: commune.id
      })
      return commune
    }
  }
}
