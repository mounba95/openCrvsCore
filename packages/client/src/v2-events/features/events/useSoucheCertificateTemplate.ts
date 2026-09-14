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

import formatISO from 'date-fns/formatISO'
import {
  areCertificateConditionsMet,
  CertificateTemplateConfig,
  ConditionalParameters,
  EventDocument,
  EventState
} from '@opencrvs/commons/client'
import { useAppConfig } from '@client/v2-events/hooks/useAppConfig'
import { useOnlineStatus } from '@client/utils'

/**
 * Niger : sélectionne le gabarit à afficher dans l'onglet "Dossier" (aperçu
 * à l'écran façon INCI) pour le type de l'acte en cours. Reproduit le même
 * filtrage event/conditionals que `useCertificateTemplateSelectorFieldConfig.ts`
 * (utilisé par le vrai flux d'impression), sans le réutiliser directement
 * puisque ce dernier renvoie un `FieldConfig` de formulaire (options d'un
 * select), pas le gabarit lui-même.
 *
 * Priorité 1 : le "Volet 1 / Souche" (document interne, jamais remis à
 * l'usager) — existe pour les actes de naissance/décès/mariage/divorce et
 * leurs variantes "jugement déclaratif".
 *
 * Priorité 2 (repli) : le gabarit par défaut (`isDefault: true`) du type
 * d'acte — utilisé pour les copies conformes (transcription d'actes anciens,
 * variantes CertifiedCopy et CertifiedCopyBefore1985), qui n'ont pas de
 * Volet 1 puisqu'elles ne créent pas un nouvel acte mais transcrivent un
 * document existant ; on affiche alors le même gabarit que celui utilisé
 * pour imprimer l'extrait remis à l'usager.
 */
export const useSoucheCertificateTemplate = (
  eventType: string,
  declaration: EventState,
  event: EventDocument
): CertificateTemplateConfig | undefined => {
  const { certificateTemplates } = useAppConfig()
  const isOnline = useOnlineStatus()

  const declarationWithEventMetadata = {
    $form: declaration,
    $event: event,
    $now: formatISO(new Date(), { representation: 'date' }),
    $online: isOnline
  } satisfies ConditionalParameters

  const isValidForEvent = (template: CertificateTemplateConfig) =>
    template.event === eventType &&
    template.isV2Template &&
    (!template.conditionals ||
      areCertificateConditionsMet(
        template.conditionals,
        declarationWithEventMetadata
      ))

  const soucheTemplate = certificateTemplates.find(
    (template) => isValidForEvent(template) && template.id.endsWith('-souche')
  )

  if (soucheTemplate) {
    return soucheTemplate
  }

  const validTemplates = certificateTemplates.filter(isValidForEvent)

  // Niger : pour les copies conformes, `isDefault: true` est lui-même posé
  // sous conditionnel (ex. seulement si "copie intégrale" ET "ancienne loi"
  // sont cochées dans la déclaration) — si la déclaration ne remplit aucune
  // de ces conditions précises, aucun gabarit `isDefault` ne passe le
  // filtre, même s'il existe un gabarit toujours disponible (ex. l'extrait,
  // sans conditionnel) qui aurait pu servir d'aperçu. On retombe donc sur le
  // premier gabarit valide tout court plutôt que de renvoyer "aucun aperçu".
  return (
    validTemplates.find((template) => template.isDefault) ?? validTemplates[0]
  )
}
