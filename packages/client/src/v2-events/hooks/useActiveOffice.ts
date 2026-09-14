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
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { UUID } from '@opencrvs/commons/client'

/**
 * Niger : commune actuellement "active" pour l'utilisateur connecté, en plus
 * de sa commune principale — permet de basculer entre ses communes affectées
 * sans se déconnecter. Envoyée au serveur via l'en-tête X-Active-Office-Id
 * (voir trpc.tsx), revalidée à chaque requête (voir CONTEXTE-PROJET.md).
 *
 * Stockage synchrone (localStorage, pas l'IDB générique de l'app) pour éviter
 * toute course avec la réhydratation asynchrone au chargement de la page :
 * les tout premiers appels tRPC doivent pouvoir lire cette valeur immédiatement.
 */
interface ActiveOfficeStore {
  activeOfficeId: UUID | null
  setActiveOffice: (officeId: UUID | null) => void
}

export const useActiveOfficeStore = create<ActiveOfficeStore>()(
  persist(
    (set) => ({
      activeOfficeId: null,
      setActiveOffice: (officeId) => set({ activeOfficeId: officeId })
    }),
    {
      name: 'active-office',
      storage: createJSONStorage(() => localStorage)
    }
  )
)

export function getActiveOfficeOverride(): UUID | undefined {
  return useActiveOfficeStore.getState().activeOfficeId ?? undefined
}

export function clearActiveOffice() {
  useActiveOfficeStore.getState().setActiveOffice(null)
}
