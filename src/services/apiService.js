const BASE_URL = import.meta.env.VITE_API_BASE_URL 
let ADMIN_KEY = import.meta.env.VITE_ADMIN_KEY || ''
try {
  if (!ADMIN_KEY && typeof localStorage !== 'undefined') {
    ADMIN_KEY = localStorage.getItem('admin_key') || ''
  }
} catch (e) {
  // ignore storage access errors (e.g. blocked in some browsers)
  ADMIN_KEY = ADMIN_KEY || ''
}

export function setAdminKey(key) {
  ADMIN_KEY = key || ''
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem('admin_key', ADMIN_KEY)
  } catch (e) {
    // ignore
  }
}

export function clearAdminKey() {
  ADMIN_KEY = ''
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem('admin_key')
  } catch (e) {
    // ignore
  }
}

async function parseJson(response) {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

async function apiFetch(path, { method = 'GET', body, headers = {} } = {}) {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`
  const requestHeaders = {
    'Content-Type': 'application/json',
    ...headers
  }

  if (ADMIN_KEY) {
    requestHeaders['x-admin-key'] = ADMIN_KEY
  }

  const response = await fetch(url, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined
  })

  const data = await parseJson(response)
  if (!response.ok) {
    const error = new Error(data?.error || 'Request failed')
    error.status = response.status
    error.code = data?.code
    error.payload = data
    throw error
  }

  return data
}

async function apiFetchBlob(path, { method = 'GET', body, headers = {} } = {}) {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`
  const requestHeaders = {
    'Content-Type': 'application/json',
    ...headers
  }

  if (ADMIN_KEY) {
    requestHeaders['x-admin-key'] = ADMIN_KEY
  }

  const response = await fetch(url, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined
  })

  if (!response.ok) {
    const data = await parseJson(response)
    const error = new Error(data?.error || 'Request failed')
    error.status = response.status
    error.code = data?.code
    error.payload = data
    throw error
  }

  return response.blob()
}

export async function listElections() {
  return apiFetch('/elections')
}

export async function createElection(payload) {
  return apiFetch('/elections', {
    method: 'POST',
    body: payload
  })
}

export async function getElection(addr) {
  return apiFetch(`/elections/${addr}`)
}

export async function patchElection(addr, updates) {
  return apiFetch(`/elections/${addr}`, {
    method: 'PATCH',
    body: updates
  })
}

export async function getResults(addr) {
  return apiFetch(`/elections/${addr}/results`)
}

export async function getRaceResults(addr, raceId) {
  return apiFetch(`/elections/${addr}/races/${raceId}/results`)
}

export async function listRaces(addr) {
  return apiFetch(`/elections/${addr}/races`)
}

export async function createRace(addr, racePayload) {
  return apiFetch(`/elections/${addr}/races`, {
    method: 'POST',
    body: racePayload
  })
}

export async function getRace(addr, raceId) {
  return apiFetch(`/elections/${addr}/races/${raceId}`)
}

export async function patchRace(addr, raceId, updates) {
  return apiFetch(`/elections/${addr}/races/${raceId}`, {
    method: 'PATCH',
    body: updates
  })
}

export async function listCandidates(addr, raceId) {
  return apiFetch(`/elections/${addr}/races/${raceId}/candidates`)
}

export async function getCandidate(addr, raceId, candidateId) {
  return apiFetch(`/elections/${addr}/races/${raceId}/candidates/${candidateId}`)
}

export async function createCandidate(addr, raceId, candidate) {
  const payload = {
    name: candidate.name,
    party: candidate.party,
    number: Number(candidate.number ?? candidate.num)
  }
  console.log('🎯 createCandidate API call:', {
    url: `/elections/${addr}/races/${raceId}/candidates`,
    payload
  })
  return apiFetch(`/elections/${addr}/races/${raceId}/candidates`, {
    method: 'POST',
    body: payload
  })
}

export async function castVote(addr, votePayload, headers = {}) {
  return apiFetch(`/elections/${addr}/votes`, {
    method: 'POST',
    body: votePayload,
    headers
  })
}

export async function verifyProof(addr, verificationPayload) {
  return apiFetch(`/elections/${addr}/verify-proof`, {
    method: 'POST',
    body: verificationPayload
  })
}

export async function getVoteReceipt(addr, nullifier) {
  return apiFetch(`/elections/${addr}/votes/${nullifier}`)
}

export async function getVoteReceiptPdf(addr, nullifier) {
  return apiFetchBlob(`/elections/${addr}/votes/${nullifier}/receipt.pdf`)
}

export async function listVoters(addr) {
  return apiFetch(`/elections/${addr}/voters`)
}

export async function registerVoters(addr, payload) {
  return apiFetch(`/elections/${addr}/voters`, {
    method: 'POST',
    body: payload
  })
}

export async function getVoterProof(addr, commitment) {
  return apiFetch(`/elections/${addr}/voters/${commitment}`)
}

export async function getBuPdf(addr) {
  return apiFetchBlob(`/elections/${addr}/audit/bu.pdf`)
}

export async function getBuJson(addr) {
  return apiFetch(`/elections/${addr}/audit/bu`)
}

export async function getZeresima(addr) {
  return apiFetch(`/elections/${addr}/audit/zeresima`)
}

export async function getRdv(addr) {
  return apiFetch(`/elections/${addr}/audit/rdv`)
}

export async function getPendingLog(addr) {
  return apiFetch(`/elections/${addr}/audit/pending`)
}

export async function relayLegacy(addr, payload) {
  return apiFetch(`/events/${addr}/relay`, {
    method: 'POST',
    body: payload
  })
}

export async function getAdminState(addr) {
  return apiFetch(`/events/${addr}/admin/state`)
}

export async function getAdminVoters(addr) {
  return apiFetch(`/events/${addr}/admin/voters`)
}

export async function healthCheck() {
  return apiFetch('/health')
}
