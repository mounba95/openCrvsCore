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
import React from 'react'
import styled from 'styled-components'

export interface IListUserProps {
  labelHeader?: React.ReactNode
  valueHeader?: React.ReactNode
  rows: Array<{
    avatar: React.ReactNode
    label: React.ReactNode
    value?: React.ReactNode
    status?: React.ReactNode
    actions?: JSX.Element[]
  }>
}

// Niger : même traitement vert que Table.tsx/Workqueue.tsx (en-tête à
// liseré vert, lignes zébrées) — appliqué à la page Équipe (UserList.tsx).
export const UserHeader = styled.table`
  border-collapse: collapse;
  width: 100%;
  background: #ffffff;
  th {
    border-top: 2px solid #52af62;
    border-bottom: 2px solid #52af62;
    color: #33795c;
    ${({ theme }) => theme.fonts.bold12};
    text-align: left;
    padding: 8px 0;
  }
  th:first-child {
    min-width: 312px;
  }
  th:nth-child(2) {
    width: 100%;
  }

  thead tr:first-child {
    text-transform: uppercase;
  }

  /* Media query for mobile */
  @media screen and (max-width: 768px) {
    th:nth-child(2) {
      display: none;
    }
  }
`

// Niger : UserHeader et chaque UserRow sont des <table> distincts mais
// restent des enfants directs du même parent (ListUser rend un
// React.Fragment) — donc en CSS, la 1ère ligne de données est en position
// paire (l'en-tête occupe la position 1). D'où ":nth-child(odd)" pour la
// 2e ligne, 4e, etc. — même alternance visuelle blanc/vert pâle que
// Table.tsx, où la 1ère ligne reste blanche.
export const UserRow = styled.table`
  border-collapse: collapse;
  width: 100%;
  background: #ffffff;
  color: #276d50;
  transition: background 0.15s ease-in-out;

  &:nth-child(odd) {
    background: #e8f8de;
  }

  &:hover {
    background: ${({ theme }) => theme.colors.brandGreenLight};
  }

  td {
    border-bottom: 1px solid #c5e0b5;
    padding: 10px 0;
  }
  td:first-child {
    ${({ theme }) => theme.fonts.bold16};
    padding-bottom: 2px;
    padding-right: 12px;
    width: 40px;
    height: 40px;
  }
  td:nth-child(2) {
    ${({ theme }) => theme.fonts.reg16};
    width: 260px;
    max-width: 260px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  td:nth-child(4) {
    position: relative;
    padding-right: 4px;
    right: 0;
    left: auto;
    text-align: right;
  }

  td:last-child {
    width: 40px;
    padding: 8px 8px;
    padding-left: 0;
    text-align: right;
  }

  /* Media query for mobile */
  @media screen and (max-width: 768px) {
    td:nth-child(2) {
      width: 100%;
      max-width: 0;
    }
    td:nth-child(3) {
      display: none;
    }
  }
`

const ActionsContainer = styled.div`
  display: flex;
  height: 40px;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
`

export function ListUser({ rows, labelHeader, valueHeader }: IListUserProps) {
  return (
    <React.Fragment>
      <UserHeader>
        <thead>
          <tr>
            <th colSpan={2}>{labelHeader}</th>
            <th>{valueHeader}</th>
            <th></th>
          </tr>
        </thead>
      </UserHeader>
      {rows.map((row, index) => (
        <UserRow key={index}>
          <tbody>
            <tr>
              {row.avatar && <td>{row.avatar}</td>}
              {row.label && <td>{row.label}</td>}
              {row.value && <td>{row.value}</td>}
              {row.status && <td>{row.status}</td>}
              {row.actions ? (
                <td>
                  <ActionsContainer>
                    {row.actions?.map((action, actionIndex) => (
                      <React.Fragment key={actionIndex}>
                        {action}
                      </React.Fragment>
                    ))}
                  </ActionsContainer>
                </td>
              ) : (
                row.actions && <td></td>
              )}
            </tr>
          </tbody>
        </UserRow>
      ))}
    </React.Fragment>
  )
}
