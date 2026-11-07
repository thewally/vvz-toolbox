import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  ROLES_CLAIM, rolesFromClaims, decodeJwtPayload, resolveRoles, isAdminRole,
  safeReturnTo, mapAuth0Error, requestAuth0PasswordReset, uuidOrNull,
} from '../src/lib/auth0Helpers.js'

function jwt(payload) {
  const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
  return `${enc({ alg: 'RS256' })}.${enc(payload)}.sig`
}

test('rollen uit claim: ontbrekend, geen array, leeg, admin, onbekend', () => {
  assert.deepEqual(rolesFromClaims({}), [])
  assert.deepEqual(rolesFromClaims(undefined), [])
  assert.deepEqual(rolesFromClaims({ [ROLES_CLAIM]: 'nieuws' }), [])
  assert.deepEqual(rolesFromClaims({ [ROLES_CLAIM]: [] }), [])
  assert.deepEqual(rolesFromClaims({ [ROLES_CLAIM]: ['nieuws', '', 5, 'nieuws', 'paginas'] }), ['nieuws', 'paginas'])
  assert.equal(isAdminRole(rolesFromClaims({ [ROLES_CLAIM]: ['admin'] })), true)
  assert.equal(isAdminRole(['nieuws']), false)
})

test('rollen uit access token, met terugval op ID-token', () => {
  assert.deepEqual(resolveRoles(jwt({ [ROLES_CLAIM]: ['nieuws'] }), {}), ['nieuws'])
  assert.deepEqual(resolveRoles(jwt({}), { [ROLES_CLAIM]: ['admin'] }), ['admin'])
  assert.deepEqual(resolveRoles('kapot', {}), [])
  assert.equal(decodeJwtPayload('geen-jwt'), null)
  assert.equal(decodeJwtPayload(null), null)
})

test('returnTo weigert open redirects en auth-pagina\'s', () => {
  assert.equal(safeReturnTo('/beheer/nieuws'), '/beheer/nieuws')
  assert.equal(safeReturnTo('//evil.nl'), '/')
  assert.equal(safeReturnTo('https://evil.nl'), '/')
  assert.equal(safeReturnTo('/\\evil.nl'), '/')
  assert.equal(safeReturnTo('/login'), '/')
  assert.equal(safeReturnTo('/wachtwoord-vergeten?x=1'), '/')
  assert.equal(safeReturnTo(undefined), '/')
})

test('Auth0-fout wordt Nederlands', () => {
  assert.match(mapAuth0Error({ error: 'access_denied' }), /geweigerd/)
  assert.match(mapAuth0Error({ error: 'iets_anders' }), /Er ging iets mis/)
})

test('resetmail: juiste aanroep en altijd neutraal succes behalve netwerkfout', async () => {
  const cfg = { domain: 'vvz.eu.auth0.com', clientId: 'cid' }
  let call
  const ok = async (url, opts) => { call = { url, opts }; return { ok: true, status: 200 } }
  let r = await requestAuth0PasswordReset('a@b.nl', cfg, ok)
  assert.equal(r.error, null)
  assert.equal(call.url, 'https://vvz.eu.auth0.com/dbconnections/change_password')
  assert.equal(call.opts.method, 'POST')
  assert.deepEqual(JSON.parse(call.opts.body), { client_id: 'cid', email: 'a@b.nl', connection: 'Username-Password-Authentication' })

  r = await requestAuth0PasswordReset('x@b.nl', { ...cfg, connection: 'eigen' }, async () => ({ ok: false, status: 400 }))
  assert.equal(r.error, null)

  r = await requestAuth0PasswordReset('a@b.nl', cfg, async () => { throw new TypeError('network') })
  assert.ok(r.error.message)
})

test('author_id alleen bij een UUID', () => {
  assert.equal(uuidOrNull('auth0|abc'), null)
  assert.equal(uuidOrNull(undefined), null)
  assert.equal(uuidOrNull('123e4567-e89b-12d3-a456-426614174000'), '123e4567-e89b-12d3-a456-426614174000')
})
