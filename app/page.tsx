export default function Page() {
  return (
    <div>
      <nav className="nav container">
        <div><strong>TeachTape</strong></div>
        <div>
          <a className="btn" href="/dashboard">Dashboard</a>
        </div>
      </nav>
      <header className="container">
        <h1>Film breakdowns and live lessons with real coaches</h1>
        <p>Launch your skills. Book vetted coaches for 1:1 training and video analysis.</p>
        <a className="btn" href="/dashboard">Get started</a>
      </header>
      <section className="container">
        <div className="grid">
          <div className="card"><h3>Verified coaches</h3><p>Background-checked, rated by athletes.</p></div>
          <div className="card"><h3>Zoom-native</h3><p>Auto-schedules meetings and sends links.</p></div>
          <div className="card"><h3>Secure payments</h3><p>Stripe Connect with instant payouts.</p></div>
        </div>
      </section>
      <footer className="footer container">
        © {new Date().getFullYear()} TeachTape — MVP starter
      </footer>
    </div>
  );
}
