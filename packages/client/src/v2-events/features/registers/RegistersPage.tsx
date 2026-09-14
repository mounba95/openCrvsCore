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
import * as React from 'react'
import styled from 'styled-components'
import { Content, ContentSize } from '@opencrvs/components/lib/Content'
import { Button, Dialog, Icon, Pill } from '@opencrvs/components'
import { Select } from '@opencrvs/components/lib/Select'
import { Table } from '@opencrvs/components/lib/Table'
import { TextInput } from '@opencrvs/components/lib/TextInput'
import { ColumnContentAlignment } from '@opencrvs/components/lib/common-types'
import { usePermissions } from '@client/hooks/useAuthorization'
import { useLocations } from '@client/v2-events/hooks/useLocations'
import { useCurrentUser } from '@client/v2-events/hooks/useCurrentUser'
import { useRegisters } from './useRegisters'
import { RegisterEventType } from './registersApi'

// Niger : même traitement de carte que la page Équipe (UserList.tsx) — fond
// vert pâle + liseré vert, calqué sur INCI (voir FormWizard.tsx). Détachée du
// menu de gauche (margin-left) — WorkqueueLayout utilise <Frame> nu (pas
// Frame.LayoutForm), donc pas de règle `${Content} { margin: 0 }` à
// contourner ici.
const AccentContent = styled(Content)`
  margin-left: 20px;
  background: #c5e0b5;
  border-top: 4px solid ${({ theme }) => theme.colors.brandGreen};
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
`

const TopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;

  > div:first-child {
    min-width: 280px;
  }
`

const NewRegisterFields = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 8px;

  // Niger : l'intitulé le plus long ("Divorce/Répudiation") doit tenir sans
  // se couper — les deux champs numériques (année, numéros déjà utilisés)
  // n'ont besoin que d'une largeur fixe modeste, le reste revient au type
  // d'acte (voir capture d'écran signalée : "Naissance" tronqué en "Nais"
  // quand ce champ était trop étroit). Ne pas utiliser InputField ici : sa
  // mise en page label-à-côté-du-champ (colonne fixe 200px + 66% max-width)
  // est pensée pour des formulaires pleine largeur et casse tout dès qu'on
  // la comprime dans une colonne étroite — d'où le "20" au lieu de "2026"
  // observé après un premier essai avec InputField.
  > div:first-child {
    flex: 1;
    min-width: 200px;
  }

  > div:nth-child(2) {
    width: 120px;
  }

  > div:nth-child(3) {
    width: 140px;
  }
`

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

// Niger : hauteur minimale de deux lignes — si un seul des trois libellés
// passe sur deux lignes (ex. "Numéros déjà utilisés" dans sa colonne
// étroite), son champ se retrouvait décalé plus bas que les deux autres
// (signalé par l'utilisateur le 2026-08-18).
const FieldGroupLabel = styled.label`
  ${({ theme }) => theme.fonts.bold14};
  color: ${({ theme }) => theme.colors.copy};
  min-height: 40px;
  display: flex;
  align-items: flex-end;
`

const FieldHint = styled.div`
  ${({ theme }) => theme.fonts.reg12};
  color: ${({ theme }) => theme.colors.grey500};
  margin-top: 4px;
`

const ActionsCell = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 4px;
`

/**
 * Niger : les 4 registres légaux tenus par chaque commune (voir décret
 * 2019-463) — un registre couvre à la fois les déclarations "dans les
 * délais" et les transcriptions de jugement déclaratif du même type (même
 * cahier, même suite de numéros), et jamais les copies conformes (qui
 * réutilisent le numéro déjà inscrit sur l'acte papier d'origine).
 */
const EVENT_TYPE_LABELS: Record<RegisterEventType, string> = {
  birth: 'Naissance',
  marriage: 'Mariage',
  death: 'Décès',
  divorce: 'Divorce et répudiation'
}

type RegisterStatus = 'OPEN' | 'CLOSED'

const STATUS_LABELS: Record<RegisterStatus, string> = {
  OPEN: 'Ouvert',
  CLOSED: 'Clôturé'
}

const STATUS_PILL_TYPE: Record<RegisterStatus, 'active' | 'default'> = {
  OPEN: 'active',
  CLOSED: 'default'
}

type ActionMode = 'close' | 'reopen' | 'delete'

interface PendingAction {
  mode: ActionMode
  eventType: RegisterEventType
  year: number
}

const PENDING_ACTION_TITLES: Record<ActionMode, string> = {
  close: 'Clôturer',
  reopen: 'Rouvrir',
  delete: 'Supprimer'
}

interface ReserveTarget {
  eventType: RegisterEventType
  year: number
  currentLastNumber: number
}

export function RegistersPage() {
  const { currentUser } = useCurrentUser()
  const { canManageRegisters } = usePermissions()
  const { getLocations } = useLocations()
  const locations = getLocations.useSuspenseQuery({
    locationType: 'CRVS_OFFICE'
  })

  const manageableOffices = [...locations.values()].filter((office) =>
    canManageRegisters(office)
  )

  const [officeId, setOfficeId] = React.useState<string | undefined>(
    currentUser.primaryOfficeId &&
      manageableOffices.some((o) => o.id === currentUser.primaryOfficeId)
      ? currentUser.primaryOfficeId
      : manageableOffices[0]?.id
  )

  const {
    registers,
    isLoading,
    openRegister,
    closeRegister,
    reopenRegister,
    deleteRegister,
    reserveNumbers,
    isMutating
  } = useRegisters(officeId)

  const [pendingAction, setPendingAction] = React.useState<PendingAction | null>(
    null
  )
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false)
  const [reserveTarget, setReserveTarget] = React.useState<ReserveTarget | null>(
    null
  )
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  const [newRegisterEventType, setNewRegisterEventType] =
    React.useState<RegisterEventType>('birth')
  const [newRegisterYear, setNewRegisterYear] = React.useState(
    String(new Date().getFullYear())
  )
  const [newRegisterInitialNumber, setNewRegisterInitialNumber] =
    React.useState('0')

  const [reserveUpToNumber, setReserveUpToNumber] = React.useState('')

  const officeOptions = manageableOffices.map((office) => ({
    value: office.id,
    label: office.name
  }))

  const eventTypeOptions = Object.entries(EVENT_TYPE_LABELS).map(
    ([value, label]) => ({ value, label })
  )

  const parsedNewRegisterYear = Number(newRegisterYear)
  const newRegisterAlreadyExists = registers.some(
    (register) =>
      register.eventType === newRegisterEventType &&
      register.year === parsedNewRegisterYear
  )
  const canCreateNewRegister =
    Number.isInteger(parsedNewRegisterYear) && !newRegisterAlreadyExists

  function openAddDialog() {
    setErrorMessage(null)
    setNewRegisterEventType('birth')
    setNewRegisterYear(String(new Date().getFullYear()))
    setNewRegisterInitialNumber('0')
    setIsAddDialogOpen(true)
  }

  const parsedNewRegisterInitialNumber = Number(newRegisterInitialNumber)

  async function confirmAddRegister() {
    setErrorMessage(null)
    try {
      await openRegister({
        eventType: newRegisterEventType,
        year: parsedNewRegisterYear,
        initialNumber: parsedNewRegisterInitialNumber || 0
      })
      setIsAddDialogOpen(false)
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Une erreur est survenue.'
      )
    }
  }

  function openReserveDialog(target: ReserveTarget) {
    setErrorMessage(null)
    setReserveUpToNumber(String(target.currentLastNumber))
    setReserveTarget(target)
  }

  const parsedReserveUpToNumber = Number(reserveUpToNumber)
  const canReserve =
    Boolean(reserveTarget) &&
    Number.isInteger(parsedReserveUpToNumber) &&
    parsedReserveUpToNumber > (reserveTarget?.currentLastNumber ?? Infinity)

  async function confirmReserveNumbers() {
    if (!reserveTarget) {
      return
    }
    setErrorMessage(null)
    try {
      await reserveNumbers({
        eventType: reserveTarget.eventType,
        year: reserveTarget.year,
        upToNumber: parsedReserveUpToNumber
      })
      setReserveTarget(null)
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Une erreur est survenue.'
      )
    }
  }

  async function confirmPendingAction() {
    if (!pendingAction) {
      return
    }
    setErrorMessage(null)
    try {
      const input = {
        eventType: pendingAction.eventType,
        year: pendingAction.year
      }
      if (pendingAction.mode === 'close') {
        await closeRegister(input)
      } else if (pendingAction.mode === 'reopen') {
        await reopenRegister(input)
      } else {
        await deleteRegister(input)
      }
      setPendingAction(null)
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Une erreur est survenue.'
      )
    }
  }

  const rows = registers.map((register) => {
    const canDelete = register.lastNumber === 0

    return {
      eventType: EVENT_TYPE_LABELS[register.eventType],
      year: String(register.year),
      status: (
        <Pill
          label={STATUS_LABELS[register.status]}
          size="small"
          type={STATUS_PILL_TYPE[register.status]}
        />
      ),
      actesEnregistres: String(register.lastNumber),
      action: (
        <ActionsCell>
          {register.status === 'OPEN' ? (
            <>
              <Button
                size="small"
                type="tertiary"
                onClick={() =>
                  openReserveDialog({
                    eventType: register.eventType,
                    year: register.year,
                    currentLastNumber: register.lastNumber
                  })
                }
              >
                Réserver des numéros
              </Button>
              <Button
                size="small"
                type="secondary"
                onClick={() =>
                  setPendingAction({
                    mode: 'close',
                    eventType: register.eventType,
                    year: register.year
                  })
                }
              >
                Clôturer
              </Button>
            </>
          ) : (
            <Button
              size="small"
              type="secondary"
              onClick={() =>
                setPendingAction({
                  mode: 'reopen',
                  eventType: register.eventType,
                  year: register.year
                })
              }
            >
              Rouvrir
            </Button>
          )}
          <Button
            disabled={!canDelete}
            size="small"
            type="icon"
            title={
              canDelete
                ? 'Supprimer ce registre'
                : 'Impossible : des actes sont déjà enregistrés dans ce registre'
            }
            onClick={() =>
              setPendingAction({
                mode: 'delete',
                eventType: register.eventType,
                year: register.year
              })
            }
          >
            <Icon color={canDelete ? 'red' : 'grey400'} name="Trash" />
          </Button>
        </ActionsCell>
      )
    }
  })

  const columns = [
    { label: "Type d'acte", width: 28, key: 'eventType' },
    { label: 'Année', width: 12, key: 'year' },
    { label: 'Statut', width: 18, key: 'status' },
    { label: 'Actes enregistrés', width: 17, key: 'actesEnregistres' },
    {
      label: '',
      width: 25,
      key: 'action',
      alignment: ColumnContentAlignment.RIGHT
    }
  ]

  return (
    <AccentContent size={ContentSize.LARGE} title="Registres">
      <TopBar>
        <Select
          id="RegistersOfficeSelect"
          options={officeOptions}
          placeholder=""
          value={officeId ?? ''}
          onChange={setOfficeId}
        />
        <Button size="medium" type="secondary" onClick={openAddDialog}>
          <Icon name="Plus" />
          Ajouter un registre
        </Button>
      </TopBar>

      {!isLoading && (
        <Table
          columns={columns}
          content={rows}
          id="registers-table"
          noResultText="Aucun registre pour cette commune"
        />
      )}

      {isAddDialogOpen && (
        <Dialog
          headerVariant="green"
          id="AddRegisterDialog"
          isOpen={isAddDialogOpen}
          title="Ajouter un registre"
          variant="large"
          width={700}
          actions={[
            <Button
              key="cancel"
              id="add_register_cancel"
              size="large"
              type="tertiary"
              onClick={() => setIsAddDialogOpen(false)}
            >
              Annuler
            </Button>,
            <Button
              key="confirm"
              disabled={!canCreateNewRegister}
              id="add_register_confirm"
              loading={isMutating}
              size="large"
              type="primary"
              onClick={confirmAddRegister}
            >
              Créer
            </Button>
          ]}
          onClose={() => setIsAddDialogOpen(false)}
        >
          <NewRegisterFields>
            <FieldGroup>
              <FieldGroupLabel htmlFor="NewRegisterEventTypeSelect">
                Type d&apos;acte
              </FieldGroupLabel>
              <Select
                id="NewRegisterEventTypeSelect"
                options={eventTypeOptions}
                placeholder=""
                value={newRegisterEventType}
                onChange={(value) =>
                  setNewRegisterEventType(value as RegisterEventType)
                }
              />
            </FieldGroup>
            <FieldGroup>
              <FieldGroupLabel htmlFor="NewRegisterYearInput">
                Année
              </FieldGroupLabel>
              <TextInput
                id="NewRegisterYearInput"
                type="number"
                value={newRegisterYear}
                onChange={(e) => setNewRegisterYear(e.target.value)}
              />
            </FieldGroup>
            <FieldGroup>
              <FieldGroupLabel htmlFor="NewRegisterInitialNumberInput">
                Numéros déjà utilisés
              </FieldGroupLabel>
              <TextInput
                id="NewRegisterInitialNumberInput"
                type="number"
                value={newRegisterInitialNumber}
                onChange={(e) => setNewRegisterInitialNumber(e.target.value)}
              />
            </FieldGroup>
          </NewRegisterFields>
          <FieldHint>
            Numéros déjà utilisés sur le registre papier (commune informatisée
            en cours d&apos;année) : le premier acte informatisé recevra le
            numéro suivant. Laissez 0 pour une commune qui commence à zéro.
          </FieldHint>
          {newRegisterAlreadyExists && (
            <p>Ce registre existe déjà pour cette commune.</p>
          )}
          {errorMessage && <p>{errorMessage}</p>}
        </Dialog>
      )}

      {reserveTarget && (
        <Dialog
          id="ReserveNumbersDialog"
          isOpen={Boolean(reserveTarget)}
          title={`Réserver des numéros — ${EVENT_TYPE_LABELS[reserveTarget.eventType]} ${reserveTarget.year}`}
          actions={[
            <Button
              key="cancel"
              id="reserve_cancel"
              size="large"
              type="tertiary"
              onClick={() => setReserveTarget(null)}
            >
              Annuler
            </Button>,
            <Button
              key="confirm"
              disabled={!canReserve}
              id="reserve_confirm"
              loading={isMutating}
              size="large"
              type="primary"
              onClick={confirmReserveNumbers}
            >
              Confirmer
            </Button>
          ]}
          onClose={() => setReserveTarget(null)}
        >
          <p>
            Le registre est actuellement à {reserveTarget.currentLastNumber}.
            Indiquez le numéro atteint sur le registre papier — le prochain
            acte informatisé recevra le numéro suivant.
          </p>
          <TextInput
            id="ReserveUpToNumberInput"
            type="number"
            value={reserveUpToNumber}
            onChange={(e) => setReserveUpToNumber(e.target.value)}
          />
          {!canReserve && reserveUpToNumber !== '' && (
            <FieldHint>
              Doit être strictement supérieur à{' '}
              {reserveTarget.currentLastNumber}.
            </FieldHint>
          )}
          {errorMessage && <p>{errorMessage}</p>}
        </Dialog>
      )}

      {pendingAction && (
        <Dialog
          id="RegisterActionConfirmDialog"
          isOpen={Boolean(pendingAction)}
          title={`${PENDING_ACTION_TITLES[pendingAction.mode]} le registre ${EVENT_TYPE_LABELS[pendingAction.eventType]} ${pendingAction.year} ?`}
          actions={[
            <Button
              key="cancel"
              id="modal_cancel"
              size="large"
              type="tertiary"
              onClick={() => {
                setPendingAction(null)
                setErrorMessage(null)
              }}
            >
              Annuler
            </Button>,
            <Button
              key="confirm"
              id="modal_confirm"
              loading={isMutating}
              size="large"
              type={pendingAction.mode === 'delete' ? 'negative' : 'primary'}
              onClick={confirmPendingAction}
            >
              Confirmer
            </Button>
          ]}
          onClose={() => setPendingAction(null)}
        >
          {pendingAction.mode === 'close' && (
            <p>
              Une fois clôturé, plus aucun acte ne pourra être enregistré dans
              ce registre pour cette année.
            </p>
          )}
          {pendingAction.mode === 'delete' && (
            <p>
              Cette action est irréversible. Le registre sera définitivement
              supprimé.
            </p>
          )}
          {errorMessage && <p>{errorMessage}</p>}
        </Dialog>
      )}
    </AccentContent>
  )
}
