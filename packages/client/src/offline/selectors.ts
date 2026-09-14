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
import { IOfflineDataState, IOfflineData } from '@client/offline/reducer'
import { getLanguage as getCurrentLocale } from '@client/i18n/selectors'
import { IStoreState } from '@client/store'
import { createSelector } from '@reduxjs/toolkit'
import { merge } from 'lodash'

const getOfflineState = (store: IStoreState): IOfflineDataState => store.offline

function getKey<K extends keyof IOfflineDataState>(store: IStoreState, key: K) {
  return getOfflineState(store)[key]
}

export function isOfflineDataLoaded(
  state: Partial<IOfflineData>
): state is IOfflineData {
  const hasAllRequiredData = state.config && state.templates && state.languages

  const isOfflineDataLoaded = Boolean(hasAllRequiredData)
  if (isOfflineDataLoaded) merge(window.config, state.config)
  return isOfflineDataLoaded
}

export const getOfflineDataLoaded = (
  store: IStoreState
): IOfflineDataState['offlineDataLoaded'] => getKey(store, 'offlineDataLoaded')

export const getOfflineData = (store: IStoreState): IOfflineData => {
  const data = getKey(store, 'offlineData')
  if (!isOfflineDataLoaded(data)) {
    throw new Error('Offline data is not yet loaded. This should never happen')
  }
  return data
}

// Niger : `data.languages[0]` renvoyait TOUJOURS la première langue déclarée
// dans client-config.ts (`['en', 'fr']` → l'anglais), quelle que soit la
// langue réellement choisie par l'utilisateur — d'où les certificats
// (compilés via cette valeur, voir useAppConfig/pdfUtils.ts) qui affichaient
// "Male" au lieu de "Masculin" alors que le reste de l'appli était bien en
// français (qui lit `state.i18n.language`, pas ce sélecteur). On choisit
// maintenant l'entrée correspondant à la langue active, avec repli sur la
// première si elle est introuvable.
export const getLanguage = createSelector(
  getOfflineData,
  getCurrentLocale,
  (data, currentLocale) =>
    data.languages.find((language) => language.lang === currentLocale) ??
    data.languages[0]
)
export const getCertificateTemplates = createSelector(
  getOfflineData,
  (data) => data.templates.certificates
)
export const getCountryLogoFile = createSelector(
  getOfflineData,
  (data) => data.config.COUNTRY_LOGO.file
)

export const selectCountryBackground = () => {
  const countryBackground = window.config.REGISTER_BACKGROUND
  if (countryBackground?.backgroundImage) {
    return {
      backgroundImage: countryBackground.backgroundImage,
      imageFit: countryBackground.imageFit
    }
  }
  return {
    backgroundColor: countryBackground?.backgroundColor ?? '36304E'
  }
}

export const getOfflineLoadingError = (
  store: IStoreState
): IOfflineDataState['loadingError'] => getKey(store, 'loadingError')
