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

import React, { useState } from 'react'
import styled from 'styled-components'
import {
  CertificateTemplateConfig,
  EventConfig,
  EventDocument,
  getAcceptedActions
} from '@opencrvs/commons/client'
import { Icon, Spinner } from '@opencrvs/components'
import { usePrintableCertificate } from '@client/v2-events/hooks/usePrintableCertificate'
import { useAppConfig } from '@client/v2-events/hooks/useAppConfig'
import { useUsers } from '@client/v2-events/hooks/useUsers'
import { useLocations } from '@client/v2-events/hooks/useLocations'
import { useAdministrativeAreas } from '@client/v2-events/hooks/useAdministrativeAreas'
import { getUserIdsFromActions } from '@client/v2-events/utils'

/**
 * Niger : filigrane "INCI" en diagonale répété sur toute la page, comme sur
 * l'écran de référence INCI — bâti en CSS via une tuile SVG répétée plutôt
 * qu'une image statique, pour rester net à n'importe quel zoom.
 */
const watermarkTile =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='260' height='200'%3E%3Ctext x='-20' y='120' font-family='Arial, Helvetica, sans-serif' font-size='42' font-weight='bold' fill='%23000000' fill-opacity='0.055' transform='rotate(-30 130 100)'%3EINCI%3C/text%3E%3C/svg%3E"

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  background: #c5e0b5;
  border-bottom: 1px solid #58b368;
`

const ToolbarButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #33795c;
  cursor: pointer;

  &:hover {
    background: rgba(255, 255, 255, 0.5);
  }
  &:disabled {
    color: #9bb89f;
    cursor: default;
    background: transparent;
  }
`

const ZoomLabel = styled.span`
  ${({ theme }) => theme.fonts.bold14};
  color: #33795c;
  min-width: 42px;
  text-align: center;
`

const PageScroller = styled.div`
  overflow: auto;
  background: #cccccc;
  padding: 24px;
`

/*
 * Niger : le certificat lui-même peint un rectangle blanc opaque en tout
 * premier élément du SVG (fond de page) — un filigrane posé en
 * background-image DERRIÈRE ce conteneur serait donc entièrement masqué.
 * On le pose plutôt en calque ABOVE le rendu du SVG (position absolue,
 * pointer-events: none pour ne pas bloquer le zoom/scroll), via ce
 * conteneur en position relative.
 */
const PageBackground = styled.div`
  position: relative;
  width: fit-content;
  margin: 0 auto;
  background-color: #ffffff;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.25);
`

const Watermark = styled.div`
  position: absolute;
  inset: 0;
  background-image: url("${watermarkTile}");
  background-repeat: repeat;
  pointer-events: none;
`

/*
 * Niger : le SVG du certificat garde ses dimensions d'impression natives
 * (souvent petites à l'écran, ex. un A4 en points), d'où un aperçu minuscule
 * si on l'affiche tel quel. On force une largeur d'affichage confortable
 * (proche d'une page A4 à l'écran) et le zoom s'applique par-dessus.
 */
const ZoomWrapper = styled.div<{ $zoom: number }>`
  transform: scale(${({ $zoom }) => $zoom});
  transform-origin: top left;

  svg {
    display: block;
    width: 820px;
    height: auto;
  }
`

/**
 * Niger : partie présentation (zoom + filigrane + rendu du SVG) réutilisée
 * à la fois par l'onglet "Dossier" (`SoucheDocumentPreview` ci-dessous, qui
 * lit les données persistées de l'acte) et par la page de révision de
 * saisie (`DeclareSouchePreview.tsx`, qui compile le même gabarit avec les
 * valeurs du formulaire en cours, pas encore enregistrées).
 */
export function SoucheSvgViewer({ svgCode }: { svgCode: string | null }) {
  const [zoom, setZoom] = useState(1)

  return (
    <>
      <Toolbar>
        <ToolbarButton
          aria-label="Réduire"
          disabled={zoom <= 0.5}
          onClick={() => setZoom((z) => Math.max(0.5, Math.round((z - 0.1) * 10) / 10))}
        >
          <Icon name="MagnifyingGlassMinus" size="small" />
        </ToolbarButton>
        <ZoomLabel>{Math.round(zoom * 100)}%</ZoomLabel>
        <ToolbarButton
          aria-label="Agrandir"
          disabled={zoom >= 2}
          onClick={() => setZoom((z) => Math.min(2, Math.round((z + 0.1) * 10) / 10))}
        >
          <Icon name="MagnifyingGlassPlus" size="small" />
        </ToolbarButton>
      </Toolbar>
      <PageScroller>
        {!svgCode ? (
          <Spinner id="dossier-souche-preview-loading" />
        ) : (
          <PageBackground>
            <ZoomWrapper
              $zoom={zoom}
              dangerouslySetInnerHTML={{ __html: svgCode }}
            />
            <Watermark />
          </PageBackground>
        )}
      </PageScroller>
    </>
  )
}

export function SoucheDocumentPreview({
  event,
  eventConfiguration,
  certificateConfig
}: {
  event: EventDocument
  eventConfiguration: EventConfig
  certificateConfig: CertificateTemplateConfig
}) {
  const actions = getAcceptedActions(event)
  const userIds = getUserIdsFromActions(actions)
  const { getUsers } = useUsers()
  const [users] = getUsers.useSuspenseQuery(userIds)

  const { getLocations } = useLocations()
  const { getAdministrativeAreas } = useAdministrativeAreas()
  const locations = getLocations.useSuspenseQuery()
  const administrativeAreas = getAdministrativeAreas.useSuspenseQuery()

  const { language } = useAppConfig()

  const { svgCode } = usePrintableCertificate({
    event,
    config: eventConfiguration,
    locations,
    administrativeAreas,
    users,
    certificateConfig,
    language
  })

  return <SoucheSvgViewer svgCode={svgCode} />
}
