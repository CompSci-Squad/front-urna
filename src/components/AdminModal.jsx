import React from 'react'

function AdminModal({ open, title, content, children, actions, onClose }) {
  if (!open) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal--admin" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <h2 className="modal-title">{title}</h2>
        </div>
        <div className="modal-body modal-body--form">
          {children || (
            <pre style={{ whiteSpace: 'pre-wrap', maxHeight: '60vh', overflow: 'auto' }}>
              {typeof content === 'string' ? content : JSON.stringify(content, null, 2)}
            </pre>
          )}
        </div>
        <div className="modal-actions">
          {actions?.map((action) => (
            <button
              key={action.label}
              className={`btn ${action.variant === 'primary' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={action.onClick}
            >
              {action.label}
            </button>
          ))}
          <button className="btn btn-ghost" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  )
}

export default AdminModal
