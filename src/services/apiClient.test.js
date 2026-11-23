import test from 'node:test'
import assert from 'node:assert/strict'
import { apiRequest, authApi, clearCsrfToken } from './apiClient.js'

// A server that issues numbered tokens and records the token on every write.
function fakeServer({ rejectFirstWrite = false } = {}) {
  let issued = 0
  const writes = []
  const reply = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
  globalThis.fetch = async (url, options = {}) => {
    if (String(url).endsWith('/auth/csrf')) return reply(200, { data: { csrfToken: 'token-' + ++issued } })
    writes.push(new Headers(options.headers).get('X-CSRF-Token'))
    if (rejectFirstWrite && writes.length === 1) return reply(403, { error: { code: 'CSRF_FAILED', message: 'Request verification failed.' } })
    return reply(200, { data: { ok: true } })
  }
  return writes
}

const write = () => apiRequest('/applications', { method: 'POST', body: {} })

test('a CSRF token is refreshed before the server expires it', async (t) => {
  const { fetch } = globalThis
  const realNow = Date.now
  t.after(() => { globalThis.fetch = fetch; Date.now = realNow })
  clearCsrfToken()
  const writes = fakeServer()
  await write()
  await write()
  Date.now = () => realNow() + 6 * 60 * 1000
  await write()
  assert.deepEqual(writes, ['token-1', 'token-1', 'token-2'])
})

test('signing in discards the anonymous CSRF token', async (t) => {
  const { fetch } = globalThis
  t.after(() => { globalThis.fetch = fetch })
  clearCsrfToken()
  const writes = fakeServer()
  await authApi.localLogin('person@example.test', 'fictional')
  await write()
  assert.deepEqual(writes, ['token-1', 'token-2'])
})

test('a refused CSRF token is replaced and the write retried once', async (t) => {
  const { fetch } = globalThis
  t.after(() => { globalThis.fetch = fetch })
  clearCsrfToken()
  const writes = fakeServer({ rejectFirstWrite: true })
  assert.deepEqual(await write(), { data: { ok: true } })
  assert.deepEqual(writes, ['token-1', 'token-2'])
})
