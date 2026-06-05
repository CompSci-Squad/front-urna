# 🗳️ Urna Digital — Frontend

Interface web para o sistema de votação eletrônica com provas de conhecimento zero (ZK Proofs), desenvolvida em React + Vite.

---

## Visão Geral

A **Urna Digital** é uma aplicação PWA (Progressive Web App) que permite:

- **Eleitores** votarem de forma anônima e verificável via ZK Proofs (PLONK)
- **Administradores** gerenciarem eleições, corridas e candidatos via painel dedicado
- **Apuração** em tempo real dos resultados por cargo

A privacidade do voto é garantida pelo circuito ZK: o eleitor prova que está na lista de votantes e que ainda não votou, **sem revelar sua identidade**.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | React 18 + Vite 5 |
| ZK Proofs | snarkjs 0.7 (PLONK) + circomlibjs |
| Hash | Poseidon (via circomlibjs) |
| PWA | vite-plugin-pwa + Workbox |
| Estilo | CSS puro com design tokens |

---

## Pré-requisitos

- Node.js >= 18
- npm >= 9

---

## Instalação

```bash
# Clone o repositório
git clone https://github.com/CompSci-Squad/front-urna.git
cd front-urna

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env
# Edite .env com a URL do seu backend
```

---

## Variáveis de Ambiente

| Variável | Descrição |
|---|---|
| `VITE_API_BASE_URL` | URL base da API do backend |

---

## Comandos

```bash
# Servidor de desenvolvimento
npm run dev

# Build de produção
npm run build

# Preview do build
npm run preview

# Testes
npm test
```

---

## Estrutura do Projeto

```
src/
├── components/          # Componentes de UI (AdminPanel, ResultsPage, VotePage...)
├── pages/               # Páginas com lógica de negócio (VotePage, ResultsPage, AdminPage...)
├── services/
│   └── apiService.js    # Comunicação com o backend REST
├── utils/
│   ├── zk.js            # Geração de provas ZK (Poseidon, Merkle, PLONK flatten)
│   └── constants.js     # Constantes globais (roles, credenciais de teste)
├── voter_proof/
│   ├── voter_proof.wasm # Artefato do circuito ZK (WebAssembly)
│   └── voter_proof.zkey # Chave de prova PLONK
├── App.jsx              # Orquestrador principal (estado global, roteamento)
└── index.css            # Estilos globais com design tokens
```

---

## Fluxo de Votação

```
1. Eleitor faz login com CPF
2. App busca a lista de votantes no backend (Merkle tree)
3. Circuito ZK gera prova de inclusão + nullifier único
4. Prova PLONK (24 field elements) é enviada ao backend
5. Backend verifica on-chain e registra o nullifier
6. Eleitor recebe comprovante com hash do nullifier
```

---

## Painel Administrativo

Acessível com CPF `11111111111` / senha `1234` (credenciais de teste).

Permite:
- Criar e gerenciar eleições
- Adicionar corridas (cargos) a uma eleição
- Cadastrar candidatos por corrida
- Acompanhar resultados em tempo real

---

## Arquitetura ZK

O circuito utiliza **PLONK** como sistema de prova. O payload enviado ao backend contém:

```json
{
  "raceId": 1,
  "pubSignals": ["merkle_root", "nullifier_hash", "candidate_id", "election_id", "race_id", "pick_index"],
  "proof": ["A[0]", "A[1]", "B[0]", "B[1]", "C[0]", "C[1]", "Z[0]", "Z[1]", "T1[0]", "T1[1]", "T2[0]", "T2[1]", "T3[0]", "T3[1]", "Wxi[0]", "Wxi[1]", "Wxiw[0]", "Wxiw[1]", "eval_a", "eval_b", "eval_c", "eval_s1", "eval_s2", "eval_zw"]
}
```

---

## Licença

MIT
