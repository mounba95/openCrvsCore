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

import {
  ConditionalType,
  field,
  FieldConfig,
  FieldType,
  or
} from '@opencrvs/commons/client'
import { useAppConfig } from '@client/v2-events/hooks/useAppConfig'
import { useUsers } from '@client/v2-events/hooks/useUsers'
import { CERT_TEMPLATE_ID } from './useCertificateTemplateSelectorFieldConfig'

/**
 * Niger : sur toute copie conforme (contrairement au Volet 3, toujours
 * signé par l'officier d'enregistrement d'origine), l'officier qui certifie
 * CETTE copie doit être choisi au moment de l'impression, dans une liste —
 * jamais saisi en texte libre (deux copies conformes du même acte,
 * imprimées des années d'écart, doivent porter le nom du même officier
 * orthographié exactement de la même façon). Champ injecté sur la page
 * d'impression au même titre que `certificateTemplateId` (voir Pages.tsx),
 * conditionné à la sélection d'un gabarit marqué `isCertifiedCopy` côté
 * country-config (certificates/handler.ts).
 *
 * Portée de la liste : les officiers ayant le rôle LOCAL_REGISTRAR au
 * bureau ACTIF de l'utilisateur connecté (celui qui imprime aujourd'hui,
 * pas forcément celui qui a enregistré l'acte à l'origine — voir
 * useUsers().getMyContext, qui reflète la commune active).
 *
 * Identifiant de champ volontairement identique à l'ancien champ texte
 * libre `certifier.name` (autrefois défini côté country-config) — les
 * gabarits SVG qui lisent déjà `annotation.certifier.name` continuent de
 * fonctionner sans modification.
 *
 * `value` du champ = le nom complet lui-même, PAS `user.id` : ce champ est
 * injecté dynamiquement ici et n'existe, côté country-config, que sous la
 * forme d'un champ TEXTE fictif jamais affiché (voir le commentaire
 * "certifier-annotation-shadow" dans birth/forms/printForm/index.ts et
 * équivalents) — un champ TEXTE restitue sa valeur brute telle quelle à
 * l'impression (compileSvg/$lookup, opencrvs-core), sans passer par la
 * traduction libellé↔option d'un vrai SELECT (qui exigerait que ce champ
 * fictif connaisse par avance, à la définition statique du formulaire, la
 * liste des officiers du bureau — impossible, elle dépend du bureau actif
 * de l'utilisateur au moment de l'impression). Stocker directement le nom
 * n'affaiblit pas la garantie d'orthographe stable : il est toujours choisi
 * dans cette liste, jamais saisi à la main.
 */
export const CERTIFIER_ID = 'certifier.name'

const CERTIFIER_ROLE = 'LOCAL_REGISTRAR'

export const useCertifierSelectorFieldConfig = ():
  | FieldConfig
  | undefined => {
  const { certificateTemplates } = useAppConfig()
  const { getMyContext, searchUsers } = useUsers()
  // Niger : useQuery (pas useSuspenseQuery) — ce hook est appelé directement
  // dans le corps de la page d'impression (Pages.tsx), qui n'a pas de limite
  // <Suspense> autour d'elle-même (seulement à l'intérieur, dans FormLayout,
  // ce qui ne peut pas rattraper une suspension déclenchée ici) ; suspendre
  // ici ferait planter/bloquer toute la page au lieu de simplement retarder
  // l'apparition du champ.
  const { data: myContext } = getMyContext.useQuery()

  const certifiedCopyTemplateIds = certificateTemplates
    .filter((template) => template.isCertifiedCopy)
    .map((template) => template.id)

  const { data: officeUsers } = searchUsers.useQuery(
    {
      primaryOfficeId: myContext?.primaryOfficeId,
      count: 100,
      skip: 0,
      sortBy: 'firstname',
      sortOrder: 'asc'
    },
    { enabled: Boolean(myContext?.primaryOfficeId) }
  )

  if (certifiedCopyTemplateIds.length === 0) {
    return undefined
  }

  const options = (officeUsers ?? [])
    .filter((user) => user.type === 'user' && user.role === CERTIFIER_ROLE)
    .map((user) => {
      // Niger : nom de famille toujours en MAJUSCULES à l'état civil (même
      // convention que formatFullNameUpperSurname côté impression) — appliqué
      // ici, à la source, puisque ce champ est stocké comme une simple chaîne
      // combinée (voir commentaire au-dessus) et ne peut plus être découpé au
      // moment de l'impression.
      const fullName =
        typeof user.name === 'string'
          ? user.name
          : [user.name.firstname, user.name.surname?.toUpperCase()]
              .filter(Boolean)
              .join(' ')
      return {
        value: fullName,
        label: {
          id: `certifier.option.${user.id}`,
          defaultMessage: fullName,
          description: "Nom d'un officier sélectionnable comme certificateur"
        }
      }
    })

  return {
    id: CERTIFIER_ID,
    type: FieldType.SELECT,
    required: true,
    conditionals: [
      {
        type: ConditionalType.SHOW,
        conditional: or(
          ...certifiedCopyTemplateIds.map((id) =>
            field(CERT_TEMPLATE_ID).isEqualTo(id)
          )
        )
      }
    ],
    label: {
      id: 'event.default.action.certificate.certifier.label',
      defaultMessage:
        "Officier de l'état civil qui certifie cette copie",
      description: 'Champ sélection OEC certifiant la copie'
    },
    noOptionsMessage: {
      id: 'event.default.action.certificate.certifier.notFound',
      defaultMessage:
        'Aucun officier trouvé pour ce bureau, contactez un administrateur',
      description: 'Message si aucun officier disponible'
    },
    options
  }
}
