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
import { LegalAgeSettings } from './legalAgeSettingsApi'

export interface AgeWarning {
  message: string
}

/**
 * Niger : différence en années pleines (révolues) entre deux dates —
 * `to` moins `from`, arrondi vers le bas (ne compte une année que si
 * l'anniversaire est déjà passé), même logique que "âge révolu" utilisée
 * dans le décret transmis par l'utilisateur.
 */
function fullYearsBetween(from: Date, to: Date): number {
  let years = to.getFullYear() - from.getFullYear()
  const monthDiff = to.getMonth() - from.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && to.getDate() < from.getDate())) {
    years -= 1
  }
  return years
}

/**
 * Niger : avertissements (non bloquants) sur les seuils d'âge légaux — voir
 * décret transmis par l'utilisateur. Écart minimum père/mère-enfant (même
 * seuil pour les deux) et âge minimum au mariage. Un champ manquant ou une
 * date invalide n'est jamais signalé ici (ce sont les validateurs de champ
 * habituels qui s'en chargent) — uniquement le cas où les deux dates sont
 * présentes et incohérentes entre elles.
 */
export function computeParentChildAgeWarnings(
  childDob: string | undefined,
  parents: { label: string; dob: string | undefined }[],
  settings: LegalAgeSettings
): AgeWarning[] {
  if (!childDob) {
    return []
  }
  const child = new Date(childDob)

  return parents.flatMap(({ label, dob }) => {
    if (!dob) {
      return []
    }
    const gap = fullYearsBetween(new Date(dob), child)
    if (gap < settings.parentChildMinAgeGap) {
      return [
        {
          message: `L'écart d'âge entre le/la ${label} et l'enfant (${gap} ans) est inférieur au minimum légal (${settings.parentChildMinAgeGap} ans).`
        }
      ]
    }
    return []
  })
}

export function computeMarriageAgeWarnings(
  marriageDate: string | undefined,
  spouses: { label: string; dob: string | undefined }[],
  settings: LegalAgeSettings
): AgeWarning[] {
  if (!marriageDate) {
    return []
  }
  const marriage = new Date(marriageDate)

  return spouses.flatMap(({ label, dob }) => {
    if (!dob) {
      return []
    }
    const age = fullYearsBetween(new Date(dob), marriage)
    if (age < settings.marriageMinAge) {
      return [
        {
          message: `L'âge du/de la ${label} au moment du mariage (${age} ans) est inférieur à l'âge légal minimum (${settings.marriageMinAge} ans).`
        }
      ]
    }
    return []
  })
}
