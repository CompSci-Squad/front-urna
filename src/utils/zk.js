const WASM_URL = new URL('../voter_proof/voter_proof.wasm', import.meta.url).href
const ZKEY_URL = new URL('../voter_proof/voter_proof.zkey', import.meta.url).href

let poseidonPromise = null
let snarkjsPromise = null

async function getPoseidon() {
  if (!poseidonPromise) {
    const { buildPoseidon } = await import('circomlibjs')
    poseidonPromise = buildPoseidon()
  }
  return poseidonPromise
}

async function getSnarkJS() {
  if (!snarkjsPromise) {
    snarkjsPromise = await import('snarkjs')
  }
  return snarkjsPromise
}

export function normalizeCpf(cpf) {
  return String(cpf).replace(/\D/g, '')
}

export function isValidCpf(cpf) {
  const clean = normalizeCpf(cpf)

  if (clean.length !== 11) return false

  // CPFs com todos dígitos iguais são inválidos
  if (/^(\d)\1{10}$/.test(clean)) return false

  // Valida 1º dígito verificador
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(clean[i]) * (10 - i)
  }
  let digit = 11 - (sum % 11)
  if (digit > 9) digit = 0
  if (digit !== parseInt(clean[9])) return false

  // Valida 2º dígito verificador
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(clean[i]) * (11 - i)
  }
  digit = 11 - (sum % 11)
  if (digit > 9) digit = 0
  if (digit !== parseInt(clean[10])) return false

  return true
}

export async function computeCommitment(cpf) {
  const normalized = normalizeCpf(cpf)
  if (!normalized) {
    throw new Error('CPF inválido para compromisso')
  }
  const poseidon = await getPoseidon()
  const hash = poseidon([BigInt(normalized)])
  return poseidon.F.toString(hash)
}

export async function buildMerkleTree(commitments) {
  const poseidon = await getPoseidon()
  const F = poseidon.F
  const DEPTH = 4
  const SIZE = 1 << DEPTH

  if (!Array.isArray(commitments)) {
    throw new Error('Commitments deve ser um array')
  }
  if (commitments.length > SIZE) {
    throw new Error(`Máximo de ${SIZE} compromissos permitidos`) 
  }

  const leaves = new Array(SIZE).fill(F.zero)
  commitments.forEach((commitment, index) => {
    leaves[index] = F.e(BigInt(commitment))
  })

  const levels = [leaves]
  for (let level = 0; level < DEPTH; level += 1) {
    const prev = levels[level]
    const next = []
    for (let i = 0; i < prev.length; i += 2) {
      next.push(poseidon([prev[i], prev[i + 1]]))
    }
    levels.push(next)
  }

  const root = F.toString(levels[DEPTH][0])
  return { levels, root }
}

export function getMerkleProof(levels, leafIndex) {
  const DEPTH = levels.length - 1
  const proof = {
    pathElements: [],
    pathIndices: []
  }

  let index = leafIndex
  for (let level = 0; level < DEPTH; level += 1) {
    const siblingIndex = index ^ 1
    proof.pathElements.push(levels[level][siblingIndex].toString())
    proof.pathIndices.push(index % 2)
    index = index >> 1
  }

  return proof
}

export async function computeNullifier(cpf, electionId, raceId, pickIndex) {
  const poseidon = await getPoseidon()
  const normalizedCpf = normalizeCpf(cpf)
  if (!normalizedCpf) {
    throw new Error('CPF inválido para nullifier')
  }

  const inputs = [
    BigInt(normalizedCpf),
    BigInt(electionId ?? '0'),
    BigInt(raceId ?? '0'),
    BigInt(pickIndex ?? '0')
  ]

  const hash = poseidon(inputs)
  return poseidon.F.toString(hash)
}

export function buildVoteCircuitInput({
  cpf,
  merkleRoot,
  pathElements,
  pathIndices,
  nullifierHash,
  candidateId,
  electionId,
  raceId,
  pickIndex
}) {
  return {
    voter_id: normalizeCpf(cpf),
    merkle_path: pathElements,
    merkle_path_indices: pathIndices,
    merkle_root: merkleRoot,
    nullifier_hash: nullifierHash,
    candidate_id: String(candidateId),
    election_id: String(electionId),
    race_id: String(raceId),
    pick_index: String(pickIndex)
  }
}

export async function generateVoteProof(circuitInput) {
  const snarkjs = await getSnarkJS()
  const { proof, publicSignals } = await snarkjs.plonk.fullProve(
    circuitInput,
    WASM_URL,
    ZKEY_URL
  )

  const flatProof = [
    proof.A[0], proof.A[1], proof.B[0], proof.B[1], proof.C[0], proof.C[1],
    proof.Z[0], proof.Z[1],
    proof.T1[0], proof.T1[1], proof.T2[0], proof.T2[1], proof.T3[0], proof.T3[1],
    proof.Wxi[0], proof.Wxi[1], proof.Wxiw[0], proof.Wxiw[1],
    proof.eval_a, proof.eval_b, proof.eval_c, proof.eval_s1, proof.eval_s2, proof.eval_zw,
  ]
  return { proofArray: flatProof, pubSignalsArray: publicSignals, publicSignals }
}
