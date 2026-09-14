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
import { DeclarationDeadlineSettings } from './declarationDeadlinesApi'

export type DeadlineActType = 'birth' | 'death' | 'marriage' | 'divorce'

export interface DeadlineComputationInput {
  actType: DeadlineActType
  /**
   * Naissance/décès/mariage : date du fait. Divorce : date du jugement.
   */
  eventDate: Date
  /**
   * Niger : Article 37 de la loi 2019 sur l'état civil — le délai de
   * viduité de 90 jours (avant de pouvoir déclarer) ne s'applique qu'à la
   * répudiation, jamais au divorce judiciaire simple (qui suit le délai
   * normal de 60 jours, comme les autres actes). Ignoré pour les actType
   * autres que 'divorce'.
   */
  isRepudiation?: boolean
  /**
   * Niger : date à laquelle la déclaration a été FAITE (`informant.
   * declarationDate` pour naissance/décès/mariage, `divorceDetails.
   * requestDate` pour le divorce) — PAS la date du jour où l'agent saisit
   * les données dans le logiciel. Un acte de 2021 ressaisi/complété en 2026
   * n'est pas hors délai si sa déclaration (papier) a bien été faite dans
   * les 60 jours du fait ; c'est cette date-là qui compte, jamais l'horloge
   * système. Corrigé le 2026-08-09 après un test réel de l'utilisateur qui
   * a révélé qu'une comparaison contre `new Date()` bloquait à tort une
   * naissance ancienne en cours de ressaisie.
   */
  declarationDate: Date
  communeId: string | undefined
  settings: DeclarationDeadlineSettings
}

export interface DeadlineComputationResult {
  deadlineDate: Date
  isLate: boolean
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

/**
 * Niger : délai légal de déclaration — 60 jours normalement, 6 mois dans
 * une commune en situation d'urgence, tous actes confondus. Pour une
 * répudiation spécifiquement (`isRepudiation`), ce délai ne démarre
 * qu'après les 90 jours de viduité (délai total = date du prononcé +
 * viduiteDays + normalDays/emergencyDays) — un divorce judiciaire simple
 * suit le délai normal, sans viduité (Article 37, loi 2019 état civil).
 * Voir le plan "Délais légaux de déclaration configurables"
 * (CONTEXTE-PROJET.md).
 */
export function computeDeclarationDeadline({
  actType,
  eventDate,
  isRepudiation,
  declarationDate,
  communeId,
  settings
}: DeadlineComputationInput): DeadlineComputationResult {
  const isUrgence = Boolean(
    communeId && settings.urgenceCommuneIds.includes(communeId)
  )
  const windowDays = isUrgence ? settings.emergencyDays : settings.normalDays

  const baseDate =
    actType === 'divorce' && isRepudiation
      ? addDays(eventDate, settings.viduiteDays)
      : eventDate

  const deadlineDate = addDays(baseDate, windowDays)
  const isLate = declarationDate.getTime() > deadlineDate.getTime()

  return { deadlineDate, isLate }
}
