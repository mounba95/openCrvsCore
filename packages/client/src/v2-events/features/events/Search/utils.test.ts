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

import { tennisClubMembershipEvent } from '@opencrvs/commons/client'
import {
  serializeSearchParams,
  deserializeSearchParams,
  buildQuickSearchQuery
} from './utils'

describe('serializeSearchParams and deserializeSearchParams (full roundtrip)', () => {
  const testObject = {
    str: 'hello',
    num: 123,
    bool: true,
    arrayPrimitives: ['x', 'y'],
    arrayObjects: [{ a: 1 }, { b: 2 }],
    plainObject: { foo: 'bar', count: 9 },
    emptyArray: [],
    nullVal: null,
    undefinedVal: undefined
  }

  const expectedDeserialized = {
    str: 'hello',
    num: '123', // everything comes in as string from URL
    bool: 'true',
    arrayPrimitives: ['x', 'y'],
    arrayObjects: [{ a: 1 }, { b: 2 }],
    plainObject: { foo: 'bar', count: 9 }
    // emptyArray is dropped
    // nullVal, undefinedVal are dropped
  }

  it('serializes correctly (match raw string)', () => {
    const output = serializeSearchParams(testObject)
    // Note: the order of parameters may vary, so we check the content instead.
    const expected =
      `arrayObjects=${encodeURIComponent(JSON.stringify({ a: 1 }))}` +
      `&arrayObjects=${encodeURIComponent(JSON.stringify({ b: 2 }))}` +
      '&arrayPrimitives=x&arrayPrimitives=y' +
      '&bool=true' +
      '&num=123' +
      `&plainObject=${encodeURIComponent(JSON.stringify({ foo: 'bar', count: 9 }))}` +
      '&str=hello'

    expect(output).toBe(expected)
  })

  it('deserializes correctly', () => {
    const serialized = serializeSearchParams(testObject)
    const deserialized = deserializeSearchParams(serialized)

    expect(deserialized).toEqual(expectedDeserialized)
  })

  it('roundtrip preserves data shape and content', () => {
    const serialized = serializeSearchParams(testObject)
    const roundtrip = deserializeSearchParams(serialized)

    expect(roundtrip).toEqual(expectedDeserialized)
  })
})

describe('buildQuickSearchQuery', () => {
  it('should build a quick search query', () => {
    const searchTerm = 'abcdefg'
    const resultQuery = buildQuickSearchQuery(searchTerm, [
      tennisClubMembershipEvent
    ])

    expect(resultQuery).toEqual({
      type: 'or',
      clauses: [
        {
          data: {
            'applicant.name': {
              type: 'fuzzy',
              term: 'abcdefg'
            }
          }
        },
        {
          data: {
            'applicant.email': {
              type: 'exact',
              term: 'abcdefg'
            }
          }
        },
        {
          data: {
            'recommender.name': {
              type: 'fuzzy',
              term: 'abcdefg'
            }
          }
        },
        {
          trackingId: {
            term: 'abcdefg',
            type: 'exact'
          }
        },
        {
          'legalStatuses.REGISTERED.registrationNumber': {
            term: 'abcdefg',
            type: 'exact'
          }
        }
      ]
    })
  })

  it('emails are searched only in email fields', () => {
    const searchTerm = 'abc@gmail.com'
    const resultQuery = buildQuickSearchQuery(searchTerm, [
      tennisClubMembershipEvent
    ])

    expect(resultQuery).toEqual({
      type: 'or',
      clauses: [
        {
          data: {
            'applicant.email': {
              type: 'exact',
              term: 'abc@gmail.com'
            }
          }
        }
      ]
    })
  })
})
