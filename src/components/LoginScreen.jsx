import React, { useState } from 'react'

function LoginScreen({ loginCpf, loginPassword, loginError, onCpfChange, onPasswordChange, onLogin, onTabChange }) {
  const [activeTab, setActiveTab] = useState('voter')

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    if (onTabChange) onTabChange()
  }

  return (
    <main className="login-screen">
      <form className="login-card" onSubmit={(e) => onLogin(e, activeTab)}>
        <div className="login-brand">
          <div className="brand-mark">U</div>
          <div>
            <p className="login-title">Urna Digital</p>
          </div>
        </div>

        <div className="login-tabs">
          <button
            type="button"
            className={`login-tab ${activeTab === 'voter' ? 'active' : ''}`}
            onClick={() => handleTabChange('voter')}
          >
            Eleitor
          </button>
          <button
            type="button"
            className={`login-tab ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => handleTabChange('admin')}
          >
            Administrador
          </button>
        </div>

        <label>
          CPF
          <input
            type="text"
            inputMode="numeric"
            placeholder="00000000000"
            value={loginCpf}
            onChange={onCpfChange}
            required
          />
        </label>

        {activeTab === 'admin' && (
          <label>
            Senha
            <input
              type="password"
              placeholder="••••••••"
              value={loginPassword}
              onChange={onPasswordChange}
            />
          </label>
        )}

        {loginError && <div className="login-error">{loginError}</div>}
        <button type="submit" className="btn btn-primary btn-lg">
          Entrar
        </button>
      </form>
    </main>
  )
}

export default LoginScreen
