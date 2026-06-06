import React from 'react'
import { UserCircle } from 'lucide-react'

function ConfirmModal({ open, vote, currentRace, onClose, onConfirm }) {
  if (!open || !vote) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <p className="modal-eyebrow">Confira os dados do candidato</p>
          <p>Confirme se as informações abaixo correspondem ao seu voto.</p>
        </div>
        <div className="modal-body">
          <div className="modal-photo">{vote.photo ? <img src={vote.photo} alt={vote.name} /> : <UserCircle size={56} strokeWidth={1.5} />}</div>
          <div className="modal-info">
            <h3>{vote.name}</h3>
            <dl>
              <div className="modal-row">
                <dt>Número</dt>
                <dd>{vote.num}</dd>
              </div>
              <div className="modal-row">
                <dt>Partido</dt>
                <dd>{vote.party}</dd>
              </div>
              <div className="modal-row">
                <dt>Cargo</dt>
                <dd>{currentRace.label}</dd>
              </div>
            </dl>
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={onConfirm}>Confirmar voto</button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal
