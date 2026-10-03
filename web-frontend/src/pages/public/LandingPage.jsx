import { Link } from 'react-router-dom';

const features = [
  { icon: '🛵', title: 'Delivery Services', desc: 'Find delivery workers for your orders across your locality' },
  { icon: '🍲', title: 'Food & Meals', desc: 'Order fresh home-cooked food directly from local providers' },
  { icon: '📚', title: 'Tuition & Education', desc: 'Connect with local tutors and coaching centers near you' },
  { icon: '🔧', title: 'Electrician & Repair', desc: 'Book skilled electricians, plumbers and repair experts' },
  { icon: '🛍️', title: 'Grocery & Vegetables', desc: 'Buy fresh vegetables and groceries from local vendors' },
  { icon: '🧹', title: 'Home Services', desc: 'Hire sweepers, servants, and domestic help easily' },
];

const howItWorks = [
  { step: '01', icon: '📋', title: 'Provider Registers', desc: 'Providers sign up, submit details & get verified by admin' },
  { step: '02', icon: '📦', title: 'List Products/Services', desc: 'Approved providers list items that go through admin review' },
  { step: '03', icon: '🛒', title: 'Customer Browses', desc: 'Customers discover providers by category, service, or location' },
  { step: '04', icon: '✅', title: 'Order & Pay', desc: 'Customer places order, provider confirms, payment on delivery or QR' },
];

export default function LandingPage() {
  return (
    <div className="hero">
      {/* Navbar */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 40px', position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40,
            background: 'linear-gradient(135deg,#FF6B00,#CC5500)',
            borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22
          }}>🇮🇳</div>
          <div>
            <div style={{ fontFamily: 'Outfit,sans-serif', fontWeight: 900, fontSize: 20, color: '#fff' }}>Bharat Sevak</div>
            <div style={{ fontSize: 10, color: '#94A3B8', letterSpacing: '0.1em' }}>SERVING THE NATION</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link to="/browse" className="btn btn-secondary btn-sm">🛍️ Browse</Link>
          <Link to="/login" className="btn btn-secondary btn-sm">Login</Link>
          <Link to="/register" className="btn btn-primary btn-sm">Get Started</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: '80px 24px', position: 'relative', zIndex: 2
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,107,0,0.12)', border: '1px solid rgba(255,107,0,0.3)',
          padding: '6px 16px', borderRadius: 100, marginBottom: 24
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--saffron)', display: 'inline-block' }} className="animate-pulse" />
          <span style={{ fontSize: 13, color: 'var(--saffron)', fontWeight: 600 }}>Empowering Daily Income Workers Across India</span>
        </div>

        <h1 style={{ fontSize: 'clamp(36px, 6vw, 72px)', fontWeight: 900, lineHeight: 1.1, maxWidth: 800, marginBottom: 20 }}>
          Your Local{' '}
          <span style={{ background: 'linear-gradient(135deg,#FF6B00,#FF8C33)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Marketplace
          </span>{' '}
          for Daily Services
        </h1>

        <p style={{ fontSize: 18, color: 'var(--text-secondary)', maxWidth: 600, lineHeight: 1.7, marginBottom: 40 }}>
          Connect with local providers for food, vegetables, home services, tuition, and more.
          Bharat Sevak automates the real-life marketplace — shop from your neighborhood, support daily workers.
        </p>

        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link to="/register?role=customer" className="btn btn-primary" style={{ padding: '14px 32px', fontSize: 16 }}>
            🛒 Shop as Customer
          </Link>
          <Link to="/register?role=provider" className="btn btn-secondary" style={{ padding: '14px 32px', fontSize: 16 }}>
            🏪 Register as Provider
          </Link>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 40, marginTop: 60, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[['Daily Workers', '5000+'], ['Services Available', '200+'], ['Areas Covered', '50+']].map(([label, val]) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 800, fontFamily: 'Outfit,sans-serif', color: 'var(--saffron)' }}>{val}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Services Grid */}
      <section style={{ padding: '80px 40px', background: 'rgba(0,0,0,0.2)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 36, marginBottom: 8 }}>What We Offer</h2>
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: 40 }}>From food to home services — all your daily needs in one platform</p>
          <div className="grid-3" style={{ gap: 20 }}>
            {features.map(f => (
              <div key={f.title} className="card" style={{ textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--saffron)'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.transform = ''; }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>{f.icon}</div>
                <h3 style={{ fontSize: 17, marginBottom: 8 }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section style={{ padding: '80px 40px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 36, marginBottom: 8 }}>How Bharat Sevak Works</h2>
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: 48 }}>Simple. Transparent. Built for India.</p>
          <div className="grid-4" style={{ gap: 20 }}>
            {howItWorks.map(h => (
              <div key={h.step} className="card" style={{ position: 'relative' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--saffron)', letterSpacing: '0.1em', marginBottom: 12 }}>STEP {h.step}</div>
                <div style={{ fontSize: 36, marginBottom: 12 }}>{h.icon}</div>
                <h3 style={{ fontSize: 16, marginBottom: 8 }}>{h.title}</h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{h.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{
        padding: '80px 40px', textAlign: 'center',
        background: 'linear-gradient(135deg, rgba(255,107,0,0.08), rgba(16,185,129,0.05))'
      }}>
        <h2 style={{ fontSize: 36, marginBottom: 12 }}>Ready to Join Bharat Sevak?</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 32, fontSize: 16 }}>Join thousands of providers and customers building a better local economy</p>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/register" className="btn btn-primary" style={{ padding: '14px 36px', fontSize: 16 }}>Start Today →</Link>
          <Link to="/browse" className="btn btn-secondary" style={{ padding: '14px 36px', fontSize: 16 }}>Browse Services</Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '24px 40px', borderTop: '1px solid var(--navy-border)', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
        © 2024 Bharat Sevak — Empowering Daily Income Workers across India 🇮🇳
      </footer>
    </div>
  );
}
