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
import React, { Fragment } from 'react'
import { navigationMessages } from '@client/i18n/messages/views/navigation'
import { constantsMessages } from '@client/i18n/messages'
import { useIntl } from 'react-intl'
import styled from 'styled-components'
import { Pagination } from '@opencrvs/components/lib/Pagination'
import {
  Content,
  Link,
  ListViewItemSimplified,
  ListViewSimplified,
  BreadCrumb,
  Divider
} from '@opencrvs/components/lib'
import { Button } from '@opencrvs/components/lib/Button'
import { Dialog } from '@opencrvs/components/lib/Dialog'
import { Icon } from '@opencrvs/components/lib/Icon'
import { TextInput } from '@opencrvs/components/lib/TextInput'
import { IBreadCrumbData } from '@opencrvs/components/src/Breadcrumb'
import { useParams, useNavigate } from 'react-router-dom'
import { formatUrl } from '@client/navigation'
import { usePermissions } from '@client/hooks/useAuthorization'
import * as routes from '@client/navigation/routes'
import { stringify } from 'querystring'
import { useLocations } from '@client/v2-events/hooks/useLocations'
import {
  AdministrativeArea,
  getAdministrativeAreaHierarchy,
  Location,
  UUID
} from '@opencrvs/commons/client'
import {
  useCreateAdministrativeArea,
  useCreateCommuneWithOffice,
  useCreateHealthFacility,
  useDeleteAdministrativeArea,
  useDeleteOffice,
  usePromoteAdministrativeArea
} from '@client/v2-events/hooks/useAdministrativeAreaMutations'
import { useAdministrativeAreas } from '../../v2-events/hooks/useAdministrativeAreas'

const DEFAULT_PAGINATION_LIST_SIZE = 10

type IRouteProps = {
  locationId: string
}

type IGetNewLevel = {
  childLocations: (Location | AdministrativeArea)[]
  breadCrumb: IBreadCrumbData[]
}

const NoRecord = styled.div<{ isFullPage?: boolean }>`
  ${({ theme }) => theme.fonts.h3};
  text-align: left;
  margin-left: ${({ isFullPage }) => (isFullPage ? `40px` : `10px`)};
  color: ${({ theme }) => theme.colors.copy};
  margin-top: 20px;
`

// Niger : même traitement de carte que la page Équipe (UserList.tsx) — fond
// vert pâle + liseré vert, calqué sur INCI (voir FormWizard.tsx). Détachée du
// menu de gauche (margin-left) — WorkqueueLayout utilise <Frame> nu (pas
// Frame.LayoutForm), donc pas de règle `${Content} { margin: 0 }` à
// contourner ici, contrairement à FormWizard.tsx/CardWrapper.
const AccentContent = styled(Content)`
  margin-left: 20px;
  background: #c5e0b5;
  border-top: 4px solid ${({ theme }) => theme.colors.brandGreen};
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
`

const TopBar = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
`

const RowWithAction = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 8px;
`

const FieldHint = styled.p`
  ${({ theme }) => theme.fonts.reg14};
  color: ${({ theme }) => theme.colors.grey500};
`

/**
 * Niger : découpage administratif éditable — voir plan "Découpage
 * administratif éditable" (CONTEXTE-PROJET.md). Réservé aux mêmes scopes
 * que les mutations tRPC sous-jacentes (`administrativeAreas.set`/
 * `locations.set`), pas de nouveau scope dédié.
 */
export function AdministrativeLevels() {
  const intl = useIntl()
  const { locationId } = useParams<IRouteProps>()
  const { canAccessOffice, hasAnyScope } = usePermissions()
  const navigate = useNavigate()
  const { getLocations } = useLocations()
  const { getAdministrativeAreas } = useAdministrativeAreas()

  const administrativeAreas = getAdministrativeAreas.useSuspenseQuery()
  const locations = getLocations.useSuspenseQuery()

  const canManageAreas = hasAnyScope(['user.data-seeding', 'config.update-all'])

  const { createAdministrativeArea, isPending: isCreatingArea } =
    useCreateAdministrativeArea()
  const { createCommuneWithOffice } = useCreateCommuneWithOffice()
  const { promoteAdministrativeArea, isPending: isPromoting } =
    usePromoteAdministrativeArea()
  const { deleteAdministrativeArea, isPending: isDeletingArea } =
    useDeleteAdministrativeArea()
  const { deleteOffice, isPending: isDeletingOffice } = useDeleteOffice()
  const { createHealthFacility, isPending: isCreatingFacility } =
    useCreateHealthFacility()

  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false)
  const [newAreaName, setNewAreaName] = React.useState('')
  const [isCreatingCommune, setIsCreatingCommune] = React.useState(false)
  const [createErrorMessage, setCreateErrorMessage] = React.useState<
    string | null
  >(null)
  const [isCreateFacilityDialogOpen, setIsCreateFacilityDialogOpen] =
    React.useState(false)
  const [newFacilityName, setNewFacilityName] = React.useState('')
  const [newFacilityFullName, setNewFacilityFullName] = React.useState('')
  const [createFacilityErrorMessage, setCreateFacilityErrorMessage] =
    React.useState<string | null>(null)
  const [promoteTarget, setPromoteTarget] =
    React.useState<AdministrativeArea | null>(null)
  const [promoteErrorMessage, setPromoteErrorMessage] = React.useState<
    string | null
  >(null)
  const [deleteTarget, setDeleteTarget] = React.useState<
    | { type: 'area'; entity: AdministrativeArea }
    | { type: 'office'; entity: Location }
    | null
  >(null)
  const [deleteErrorMessage, setDeleteErrorMessage] = React.useState<
    string | null
  >(null)

  const getNewLevel = (
    currentlySelectedLocationId: UUID | null
  ): IGetNewLevel => {
    const childLocations = [...locations.values()].filter(
      ({ administrativeAreaId, validUntil }) =>
        (validUntil === null || new Date(validUntil) > new Date()) &&
        administrativeAreaId === currentlySelectedLocationId
    )

    const childAdministrativeAreas = [...administrativeAreas.values()].filter(
      ({ parentId, validUntil }) =>
        (validUntil === null || new Date(validUntil) > new Date()) &&
        parentId === currentlySelectedLocationId
    )

    let dataOfBreadCrumb: IBreadCrumbData[] = [
      {
        label: intl.formatMessage(constantsMessages.countryName),
        paramId: ''
      }
    ]

    if (currentlySelectedLocationId) {
      const locationBreadCrumb: IBreadCrumbData[] =
        getAdministrativeAreaHierarchy(
          currentlySelectedLocationId,
          administrativeAreas
        )
          .reverse()
          .map((area) => ({ label: area.name, paramId: area.id }))

      dataOfBreadCrumb = [...dataOfBreadCrumb, ...locationBreadCrumb]
    }

    return {
      breadCrumb: dataOfBreadCrumb,
      childLocations: [...childAdministrativeAreas, ...childLocations]
    }
  }

  const currentAreaId = UUID.safeParse(locationId).data ?? null
  const dataLocations = getNewLevel(currentAreaId)
  const totalNumber = dataLocations.childLocations.length

  // Niger : le pays a 3 niveaux administratifs (région → département →
  // commune) — au-delà, il n'y a plus que des bureaux d'état civil
  // (créés automatiquement avec leur commune, jamais seuls ici). La
  // profondeur se déduit du fil d'Ariane : 1 ("Niger" seul) = on est à la
  // racine, sur le point de créer une région ; 2 = dans une région, sur le
  // point de créer un département ; 3 = dans un département, sur le point
  // de créer une commune ; 4 = dans une commune, plus rien à créer ici.
  const depth = dataLocations.breadCrumb.length - 1
  const canCreateZone = depth < 3
  const isCreatingAtCommuneLevel = depth === 2
  // Niger : depth === 3 = on est DANS une commune (currentAreaId est la
  // commune), en train de voir ses bureaux/formations sanitaires — c'est
  // ici, et seulement ici, qu'on peut créer une formation sanitaire.
  const isInsideCommune = depth === 3
  const [currentPageNumber, setCurrentPageNumber] = React.useState<number>(1)

  React.useEffect(() => {
    setCurrentPageNumber(1)
  }, [locationId])

  const changeLevelAction = (
    e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement, MouseEvent>,
    id: string
  ) => {
    e.preventDefault()
    navigate(formatUrl(routes.ORGANISATIONS_INDEX, { locationId: id }))
  }

  const onClickBreadCrumb = (crumb: IBreadCrumbData) => {
    setCurrentPageNumber(1)
    navigate(
      formatUrl(routes.ORGANISATIONS_INDEX, { locationId: crumb.paramId ?? '' })
    )
  }

  function openCreateDialog() {
    setCreateErrorMessage(null)
    setNewAreaName('')
    setIsCreateDialogOpen(true)
  }

  async function confirmCreateArea() {
    setCreateErrorMessage(null)
    try {
      if (isCreatingAtCommuneLevel) {
        if (!currentAreaId) {
          throw new Error(
            "Une commune doit être créée sous un département, pas directement sous le pays."
          )
        }
        setIsCreatingCommune(true)
        await createCommuneWithOffice({
          name: newAreaName,
          parentId: currentAreaId
        })
        setIsCreatingCommune(false)
      } else {
        await createAdministrativeArea({
          name: newAreaName,
          parentId: currentAreaId
        })
      }
      setIsCreateDialogOpen(false)
    } catch (error) {
      setIsCreatingCommune(false)
      setCreateErrorMessage(
        error instanceof Error ? error.message : 'Une erreur est survenue.'
      )
    }
  }

  function openCreateFacilityDialog() {
    setCreateFacilityErrorMessage(null)
    setNewFacilityName('')
    setNewFacilityFullName('')
    setIsCreateFacilityDialogOpen(true)
  }

  async function confirmCreateFacility() {
    if (!currentAreaId) {
      return
    }
    setCreateFacilityErrorMessage(null)
    try {
      await createHealthFacility({
        name: newFacilityName,
        fullName: newFacilityFullName,
        administrativeAreaId: currentAreaId
      })
      setIsCreateFacilityDialogOpen(false)
    } catch (error) {
      setCreateFacilityErrorMessage(
        error instanceof Error ? error.message : 'Une erreur est survenue.'
      )
    }
  }

  // Niger : "ériger" = repointer parentId vers le grand-parent actuel (ou
  // null pour passer département → région, sommet de l'arbre) — voir
  // useAdministrativeAreaMutations.ts.
  const promoteNewParentId = promoteTarget
    ? (administrativeAreas.get(promoteTarget.parentId as UUID)?.parentId ??
      null)
    : null

  async function confirmPromote() {
    if (!promoteTarget) {
      return
    }
    setPromoteErrorMessage(null)
    try {
      await promoteAdministrativeArea(promoteTarget, promoteNewParentId)
      setPromoteTarget(null)
    } catch (error) {
      setPromoteErrorMessage(
        error instanceof Error ? error.message : 'Une erreur est survenue.'
      )
    }
  }

  // Niger : ne jamais proposer "Supprimer" sur une zone qui a encore des
  // sous-zones ou un bureau — éviter d'orpheliner des communes/offices
  // existants (même esprit que "canDelete" dans RegistersPage.tsx).
  function hasChildren(areaId: UUID): boolean {
    const hasChildArea = [...administrativeAreas.values()].some(
      (area) =>
        area.parentId === areaId &&
        (area.validUntil === null || new Date(area.validUntil) > new Date())
    )
    const hasChildOffice = [...locations.values()].some(
      (office) =>
        office.administrativeAreaId === areaId &&
        (office.validUntil === null ||
          new Date(office.validUntil) > new Date())
    )
    return hasChildArea || hasChildOffice
  }

  async function confirmDelete() {
    if (!deleteTarget) {
      return
    }
    setDeleteErrorMessage(null)
    try {
      if (deleteTarget.type === 'area') {
        await deleteAdministrativeArea(deleteTarget.entity)
      } else {
        await deleteOffice(deleteTarget.entity)
      }
      setDeleteTarget(null)
    } catch (error) {
      setDeleteErrorMessage(
        error instanceof Error ? error.message : 'Une erreur est survenue.'
      )
    }
  }

  return (
    <AccentContent
      title={intl.formatMessage(navigationMessages.organisation)}
      showTitleOnMobile={false}
    >
      <Fragment key={'.0'}>
        {canManageAreas && (canCreateZone || isInsideCommune) && (
          <TopBar>
            {canCreateZone && (
              <Button
                size="medium"
                type="secondary"
                onClick={openCreateDialog}
              >
                <Icon name="Plus" />
                Créer une zone
              </Button>
            )}
            {isInsideCommune && (
              <Button
                size="medium"
                type="secondary"
                onClick={openCreateFacilityDialog}
              >
                <Icon name="Plus" />
                Créer une formation sanitaire
              </Button>
            )}
          </TopBar>
        )}
        <BreadCrumb
          items={dataLocations.breadCrumb}
          onSelect={onClickBreadCrumb}
        />
        <Divider />
        <ListViewSimplified bottomBorder rowHeight={'small'}>
          {dataLocations.childLocations.length > 0 ? (
            dataLocations.childLocations
              ?.slice(
                (currentPageNumber - 1) * DEFAULT_PAGINATION_LIST_SIZE,
                currentPageNumber * DEFAULT_PAGINATION_LIST_SIZE
              )
              .map((level: Location | AdministrativeArea, index: number) => {
                const isArea = AdministrativeArea.safeParse(level).success
                // Niger : parmi les Location (non-zones), seuls les bureaux
                // CRVS mènent à une liste d'utilisateurs — une formation
                // sanitaire n'a pas d'utilisateurs, juste un nom
                // abrégé/complet, donc pas de navigation au clic.
                const isHealthFacility =
                  !isArea &&
                  (level as Location).locationType === 'HEALTH_FACILITY'
                const link = isArea ? (
                  <Link
                    onClick={(e) => {
                      setCurrentPageNumber(1)
                      changeLevelAction(e, level.id)
                    }}
                  >
                    {level.name}
                  </Link>
                ) : isHealthFacility ? (
                  <>{level.name}</>
                ) : (
                  <Link
                    disabled={!canAccessOffice(level)}
                    onClick={() =>
                      navigate({
                        pathname: routes.TEAM_USER_LIST,
                        search: stringify({
                          locationId: level.id
                        })
                      })
                    }
                  >
                    {level.name}
                  </Link>
                )

                const areaLevel = level as AdministrativeArea
                const canPromote =
                  isArea && canManageAreas && areaLevel.parentId !== null
                const canDelete =
                  canManageAreas && !hasChildren(level.id as UUID)
                const actions: React.ReactNode[] = []

                if (canPromote) {
                  actions.push(
                    <Button
                      key="promote"
                      size="small"
                      type="tertiary"
                      onClick={() => {
                        setPromoteErrorMessage(null)
                        setPromoteTarget(areaLevel)
                      }}
                    >
                      Ériger
                    </Button>
                  )
                }
                if (canDelete) {
                  actions.push(
                    <Button
                      key="delete"
                      size="small"
                      type="tertiary"
                      onClick={() => {
                        setDeleteErrorMessage(null)
                        setDeleteTarget(
                          isArea
                            ? { type: 'area', entity: areaLevel }
                            : { type: 'office', entity: level as Location }
                        )
                      }}
                    >
                      <Icon color="red" name="Trash" />
                    </Button>
                  )
                }

                return (
                  <ListViewItemSimplified
                    key={index}
                    label={
                      actions.length > 0 ? (
                        <RowWithAction>
                          {link}
                          {actions}
                        </RowWithAction>
                      ) : (
                        link
                      )
                    }
                  />
                )
              })
          ) : (
            <NoRecord id="no-record">
              {intl.formatMessage(constantsMessages.noResults)}
            </NoRecord>
          )}
        </ListViewSimplified>
      </Fragment>
      {totalNumber > DEFAULT_PAGINATION_LIST_SIZE && (
        <Pagination
          currentPage={currentPageNumber}
          totalPages={Math.ceil(totalNumber / DEFAULT_PAGINATION_LIST_SIZE)}
          onPageChange={(currentPage: number) =>
            setCurrentPageNumber(currentPage)
          }
        />
      )}

      {isCreateDialogOpen && (
        <Dialog
          id="CreateAdministrativeAreaDialog"
          isOpen={isCreateDialogOpen}
          title="Créer une zone"
          actions={[
            <Button
              key="cancel"
              size="large"
              type="tertiary"
              onClick={() => setIsCreateDialogOpen(false)}
            >
              Annuler
            </Button>,
            <Button
              key="confirm"
              disabled={!newAreaName.trim()}
              loading={isCreatingArea || isCreatingCommune}
              size="large"
              type="primary"
              onClick={confirmCreateArea}
            >
              Créer
            </Button>
          ]}
          onClose={() => setIsCreateDialogOpen(false)}
        >
          <FieldHint>
            La zone sera créée sous{' '}
            {dataLocations.breadCrumb[dataLocations.breadCrumb.length - 1]
              ?.label ?? intl.formatMessage(constantsMessages.countryName)}
            {isCreatingAtCommuneLevel
              ? ' — il s\'agit donc d\'une commune, son bureau d\'état civil sera créé automatiquement.'
              : '.'}
          </FieldHint>
          <TextInput
            id="NewAreaNameInput"
            value={newAreaName}
            onChange={(e) => setNewAreaName(e.target.value)}
          />
          {createErrorMessage && <p>{createErrorMessage}</p>}
        </Dialog>
      )}

      {isCreateFacilityDialogOpen && (
        <Dialog
          id="CreateHealthFacilityDialog"
          isOpen={isCreateFacilityDialogOpen}
          title="Créer une formation sanitaire"
          actions={[
            <Button
              key="cancel"
              size="large"
              type="tertiary"
              onClick={() => setIsCreateFacilityDialogOpen(false)}
            >
              Annuler
            </Button>,
            <Button
              key="confirm"
              disabled={
                !newFacilityName.trim() || !newFacilityFullName.trim()
              }
              loading={isCreatingFacility}
              size="large"
              type="primary"
              onClick={confirmCreateFacility}
            >
              Créer
            </Button>
          ]}
          onClose={() => setIsCreateFacilityDialogOpen(false)}
        >
          <FieldHint>
            La formation sanitaire sera créée sous{' '}
            {dataLocations.breadCrumb[dataLocations.breadCrumb.length - 1]
              ?.label ?? intl.formatMessage(constantsMessages.countryName)}
            . Le nom abrégé apparaît dans les listes déroulantes, le nom
            complet sur les actes imprimés.
          </FieldHint>
          <FieldHint>Nom abrégé (ex: CSI Tanda)</FieldHint>
          <TextInput
            id="NewFacilityNameInput"
            value={newFacilityName}
            onChange={(e) => setNewFacilityName(e.target.value)}
          />
          <FieldHint>
            Nom complet (ex: Centre de Santé Intégré de Tanda)
          </FieldHint>
          <TextInput
            id="NewFacilityFullNameInput"
            value={newFacilityFullName}
            onChange={(e) => setNewFacilityFullName(e.target.value)}
          />
          {createFacilityErrorMessage && <p>{createFacilityErrorMessage}</p>}
        </Dialog>
      )}

      {promoteTarget && (
        <Dialog
          id="PromoteAdministrativeAreaDialog"
          isOpen={Boolean(promoteTarget)}
          title={`Ériger ${promoteTarget.name} ?`}
          actions={[
            <Button
              key="cancel"
              size="large"
              type="tertiary"
              onClick={() => setPromoteTarget(null)}
            >
              Annuler
            </Button>,
            <Button
              key="confirm"
              loading={isPromoting}
              size="large"
              type="primary"
              onClick={confirmPromote}
            >
              Confirmer
            </Button>
          ]}
          onClose={() => setPromoteTarget(null)}
        >
          <p>
            {promoteTarget.name} passera au niveau supérieur (directement
            sous{' '}
            {promoteNewParentId
              ? (administrativeAreas.get(promoteNewParentId)?.name ??
                intl.formatMessage(constantsMessages.countryName))
              : intl.formatMessage(constantsMessages.countryName)}
            ) et pourra désormais avoir ses propres sous-zones. Cette action
            ne modifie pas les actes déjà enregistrés.
          </p>
          {promoteErrorMessage && <p>{promoteErrorMessage}</p>}
        </Dialog>
      )}

      {deleteTarget && (
        <Dialog
          id="DeleteAdministrativeAreaDialog"
          isOpen={Boolean(deleteTarget)}
          title={`Supprimer ${deleteTarget.entity.name} ?`}
          actions={[
            <Button
              key="cancel"
              size="large"
              type="tertiary"
              onClick={() => setDeleteTarget(null)}
            >
              Annuler
            </Button>,
            <Button
              key="confirm"
              loading={isDeletingArea || isDeletingOffice}
              size="large"
              type="negative"
              onClick={confirmDelete}
            >
              Supprimer
            </Button>
          ]}
          onClose={() => setDeleteTarget(null)}
        >
          <p>
            {deleteTarget.entity.name} ne sera plus utilisable pour de
            nouveaux actes ou de nouveaux bureaux. Cette action ne modifie
            pas les actes déjà enregistrés.
          </p>
          {deleteErrorMessage && <p>{deleteErrorMessage}</p>}
        </Dialog>
      )}
    </AccentContent>
  )
}
