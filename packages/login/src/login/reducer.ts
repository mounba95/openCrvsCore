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
import { loop, LoopReducer, Cmd, Loop, RunCmd } from 'redux-loop'
import * as actions from '@login/login/actions'
import {
  authApi,
  IApplicationConfig,
  IAuthenticateResponse,
  ITokenResponse
} from '@login/utils/authApi'

import { merge } from 'lodash'
import { IStoreState } from '@login/store'

export type LoginState = {
  submitting: boolean
  token: string
  refreshToken?: string
  authenticationDetails: { nonce: string; mobile?: string; email?: string }
  submissionError: boolean
  resentAuthenticationCode: boolean
  stepOneDetails: { username: string }
  config: Partial<IApplicationConfig>
  redirectToURL?: string
  errorCode?: number
  reloadModalVisibility: boolean
}

export const initialState: LoginState = {
  submitting: false,
  token: '',
  refreshToken: '',
  config: {},
  authenticationDetails: {
    nonce: '',
    mobile: '',
    email: ''
  },
  submissionError: false,
  resentAuthenticationCode: false,
  stepOneDetails: { username: '' },
  redirectToURL: '',
  reloadModalVisibility: false
}

const CONFIG_CMD = Cmd.run<
  actions.ApplicationConfigFailed,
  actions.ApplicationConfigLoaded
>(authApi.getApplicationConfig, {
  successActionCreator: actions.applicationConfigLoadedAction,
  failActionCreator: actions.applicationConfigFailedAction
})
const RETRY_TIMEOUT = 5000
function delay(cmd: RunCmd<any>, time: number) {
  return Cmd.list(
    [Cmd.run(() => new Promise((resolve) => setTimeout(resolve, time))), cmd],
    { sequence: true }
  )
}

// Niger : si l'utilisateur a plusieurs communes affectées, on lui laisse
// choisir sa commune active (Step Three) avant de rediriger vers
// l'application. Un seul bureau (le cas normal) → redirection immédiate,
// comportement inchangé. En cas d'échec de cette vérification, on ne
// bloque pas la connexion : on redirige immédiatement comme avant.
// Utilisé à la fois après le code 2FA (VERIFY_CODE_COMPLETED) et,
// lorsque le 2FA est désactivé (TWO_FA_ENABLED=false), directement après
// la saisie identifiant/mot de passe (AUTHENTICATION_COMPLETED).
async function redirectToAppOrStepThree(
  getState: () => IStoreState,
  token: string,
  refreshToken: string,
  toStepThree: () => void
) {
  try {
    const { officeIds } = await authApi.getMyContext(token)
    if (officeIds.length > 1) {
      toStepThree()
      return
    }
  } catch {
    // fail open — voir commentaire ci-dessus
  }

  const redirectToURL = getState().login.redirectToURL
  // Strip leading slash from redirectToURL to avoid double slash e.g. /register//events/...
  const fullURL = redirectToURL
    ? `/register/${redirectToURL.replace(/^\//, '')}?refreshToken=${refreshToken}&lang=${
        getState().i18n.language
      }`
    : `/register?refreshToken=${refreshToken}&lang=${getState().i18n.language}`

  window.location.assign(fullURL)
}

export const loginReducer: LoopReducer<LoginState, actions.Action> = (
  state: LoginState = initialState,
  action: actions.Action
): LoginState | Loop<LoginState, actions.Action> => {
  switch (action.type) {
    case actions.CONFIG_LOAD:
      return loop(state, CONFIG_CMD)
    case actions.CONFIG_LOADED:
      return loop(
        { ...state, config: action.payload },
        Cmd.run(() => merge(window.config, action.payload))
      )
    case actions.CONFIG_LOAD_ERROR:
      return loop(state, delay(CONFIG_CMD, RETRY_TIMEOUT))
    case actions.AUTHENTICATE:
      return loop(
        {
          ...state,
          submitting: true,
          submissionError: false,
          resentAuthenticationCode: false,
          stepOneDetails: action.payload
        },
        Cmd.run<
          actions.AuthenticationFailedAction,
          actions.AuthenticateResponseAction
        >(authApi.authenticate, {
          successActionCreator: (args: IAuthenticateResponse) =>
            actions.completeAuthentication(
              args,
              action.payload.toStepTwo,
              action.payload.toStepThree
            ),
          failActionCreator: actions.failAuthentication,
          args: [action.payload]
        })
      )
    case actions.AUTHENTICATE_VALIDATE:
      return {
        ...state,
        submissionError: true,
        errorCode: action.payload
      }
    case actions.AUTHENTICATE_RESET:
      return {
        ...state,
        submissionError: false
      }
    case actions.AUTHENTICATION_FAILED:
      if (action.payload.message === 'VERSION_MISMATCH')
        return {
          ...state,
          reloadModalVisibility: true
        }
      return {
        ...state,
        submitting: false,
        submissionError: true,
        errorCode: action.payload.response && action.payload.response.status
      }
    case actions.AUTHENTICATION_COMPLETED:
      return loop(
        {
          ...state,
          submitting: action.payload.token ? true : false,
          submissionError: false,
          resentAuthenticationCode: false,
          // Niger : nécessaire pour que StepThreeContainer (getToken) puisse
          // fonctionner quand on l'atteint directement depuis ce cas (2FA
          // désactivé), sans passer par VERIFY_CODE_COMPLETED.
          token: action.payload.token ?? state.token,
          refreshToken: action.payload.refreshToken,
          authenticationDetails: {
            ...state.authenticationDetails,
            nonce: action.payload.nonce,
            mobile: action.payload.mobile,
            email: action.payload.email
          }
        },

        Cmd.run(
          async (getState: () => IStoreState) => {
            if (action.payload.token) {
              if (!action.payload.refreshToken) {
                window.location.assign('/login')
                return
              }
              // Niger : TWO_FA_ENABLED=false → le serveur a déjà renvoyé un
              // token directement, sans passer par Step Two. On applique la
              // même vérification multi-commune qu'après un code 2FA.
              await redirectToAppOrStepThree(
                getState,
                action.payload.token,
                action.payload.refreshToken,
                action.payload.toStepThree
              )
            } else {
              action.payload.toStepTwo()
            }
          },

          { args: [Cmd.getState] }
        )
      )
    case actions.RESEND_AUTHENTICATION_CODE:
      const notificationEvent = action.payload
      return loop(
        {
          ...state,
          submissionError: false,
          resentAuthenticationCode: false
        },
        Cmd.run<
          actions.ResendAuthenticationCodeFailedAction,
          actions.ResendAuthenticationCodeCompleteAction
        >(authApi.resendAuthenticationCode, {
          successActionCreator: actions.completeAuthenticationCodeResend,
          failActionCreator: actions.failAuthenticationCodeResend,
          args: [state.authenticationDetails.nonce, notificationEvent]
        })
      )
    case actions.RESEND_AUTHENTICATION_CODE_FAILED:
      if (action.payload.message === 'VERSION_MISMATCH')
        return {
          ...state,
          reloadModalVisibility: true
        }
      return {
        ...state,
        resentAuthenticationCode: false,
        submissionError: true
      }
    case actions.RESEND_AUTHENTICATION_CODE_COMPLETED:
      return {
        ...state,
        resentAuthenticationCode: true,
        submissionError: false,
        authenticationDetails: {
          ...state.authenticationDetails,
          nonce: action.payload.nonce
        }
      }
    case actions.CLIENT_REDIRECT_ROUTE:
      const redirectRoute = action.payload.url
      return {
        ...state,
        redirectToURL: redirectRoute
      }
    case actions.VERIFY_CODE:
      const code = action.payload.code
      return loop(
        {
          ...state,
          submitting: true,
          submissionError: false,
          resentAuthenticationCode: false
        },
        Cmd.run<
          actions.VerifyCodeFailedAction,
          actions.VerifyCodeCompleteAction
        >(authApi.verifyCode, {
          successActionCreator: (response: ITokenResponse) =>
            actions.completeVerifyCode(response, action.payload.inAppRedirect),
          failActionCreator: actions.failVerifyCode,
          args: [{ code, nonce: state.authenticationDetails.nonce }]
        })
      )
    case actions.VERIFY_CODE_FAILED:
      if (action.payload.message === 'VERSION_MISMATCH')
        return {
          ...state,
          reloadModalVisibility: true
        }
      return { ...state, submitting: false, submissionError: true }
    case actions.VERIFY_CODE_COMPLETED:
      return loop(
        {
          ...state,
          stepSubmitting: false,
          submissionError: false,
          resentAuthenticationCode: false,
          token: action.payload.token,
          refreshToken: action.payload.refreshToken
        },
        Cmd.run(
          async (getState: () => IStoreState) => {
            if (!action.payload.refreshToken) {
              window.location.assign('/login')
              return
            }

            await redirectToAppOrStepThree(
              getState,
              action.payload.token,
              action.payload.refreshToken,
              action.payload.inAppRedirect
            )
          },
          { args: [Cmd.getState] }
        )
      )
    case actions.GOTO_APP:
      return loop(
        {
          ...state
        },
        Cmd.run(() => {
          if (state.refreshToken) {
            window.location.assign(
              `/register/?refreshToken=${state.refreshToken}`
            )
          } else {
            window.location.assign('/login')
          }
        })
      )
    case actions.RELOAD_MODAL_VISIBILITY:
      return { ...state, reloadModalVisibility: action.payload.visibility }
    default:
      return state
  }
}
