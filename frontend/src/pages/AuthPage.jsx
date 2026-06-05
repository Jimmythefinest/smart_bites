import { Field } from "./shared";

export function AuthPage({
  authMode,
  setAuthMode,
  error,
  authPending,
  loginForm,
  setLoginForm,
  registerForm,
  setRegisterForm,
  handleLogin,
  handleRegister,
  toasts,
}) {
  return (
    <main className="layout auth-layout app-shell auth-shell antialiased">
      <div className="toast-stack" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.type}`}>{toast.message}</div>
        ))}
      </div>
      <section className="auth-overlay reveal">
        <section className="auth-modal" aria-label="Account access">
          <div className="auth-modal-head">
            <div>
              <p className="auth-eyebrow">Smart Bites</p>
              <h2>{authMode === "login" ? "Welcome back" : "Create your account"}</h2>
              <p className="auth-subtitle">Access live marketplace, kitchen, and admin workspaces.</p>
            </div>
            <div className="brand-mark small">
              <img src="/images/logo.png" alt="" />
            </div>
          </div>

          <nav className="role-switcher" aria-label="Auth mode selector">
            <button
              type="button"
              className={authMode === "login" ? "active" : ""}
              onClick={() => setAuthMode("login")}
            >
              Login
            </button>
            <button
              type="button"
              className={authMode === "register" ? "active" : ""}
              onClick={() => setAuthMode("register")}
            >
              Register
            </button>
          </nav>

          {error ? <p className="error auth-error">{error}</p> : null}

          {authMode === "login" ? (
            <form onSubmit={handleLogin} className="form">
              <Field
                label="Email"
                type="email"
                value={loginForm.email}
                onChange={(e) => setLoginForm((c) => ({ ...c, email: e.target.value }))}
                required
              />
              <Field
                label="Password"
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm((c) => ({ ...c, password: e.target.value }))}
                required
              />
              <button type="submit" disabled={authPending}>Sign In</button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="form">
              <Field
                label="Full Name"
                value={registerForm.full_name}
                onChange={(e) => setRegisterForm((c) => ({ ...c, full_name: e.target.value }))}
                required
              />
              <Field
                label="Email"
                type="email"
                value={registerForm.email}
                onChange={(e) => setRegisterForm((c) => ({ ...c, email: e.target.value }))}
                required
              />
              <Field
                label="Password"
                type="password"
                value={registerForm.password}
                onChange={(e) => setRegisterForm((c) => ({ ...c, password: e.target.value }))}
                required
              />
              <button type="submit" disabled={authPending}>Create Account</button>
            </form>
          )}

          <p className="auth-note">JWT session auth</p>
        </section>
      </section>
    </main>
  );
}
