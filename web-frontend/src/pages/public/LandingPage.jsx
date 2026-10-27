import { Link } from 'react-router-dom';
import PledgeContent, { PLEDGE_TITLE } from '../../components/PledgeContent';
import '../../pledge.css';

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
  { step: '04', icon: '✅', title: 'Order & Pay', desc: 'Customer places order, live tracks delivery, verifies via OTP' },
];

export default function LandingPage() {
  return (
    <div className="hero">
      {/* Responsive Navbar */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 20px', position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(15,23,42,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)', flexWrap: 'wrap', gap: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38, height: 38,
            background: 'linear-gradient(135deg,#FF6B00,#CC5500)',
            borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20
          }}>🇮🇳</div>
          <div>
            <div style={{ fontFamily: 'Outfit,sans-serif', fontWeight: 900, fontSize: 18, color: '#fff' }}>Bharat Sevak</div>
            <div style={{ fontSize: 9, color: '#94A3B8', letterSpacing: '0.1em' }}>SERVING THE NATION</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link to="/browse" className="btn btn-secondary btn-sm">🛍️ Browse</Link>
          <Link to="/login" className="btn btn-secondary btn-sm">Login</Link>
          <Link to="/register" className="btn btn-primary btn-sm">Get Started</Link>
          <Link to="/pledge" className="btn btn-secondary btn-sm">Pledge &amp; Terms</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: '60px 16px', position: 'relative', zIndex: 2
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,107,0,0.12)', border: '1px solid rgba(255,107,0,0.3)',
          padding: '6px 14px', borderRadius: 100, marginBottom: 20, maxWidth: '95%'
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--saffron)', display: 'inline-block', flexShrink: 0 }} className="animate-pulse" />
          <span style={{ fontSize: 12, color: 'var(--saffron)', fontWeight: 600 }}>Empowering Daily Income Workers Across India</span>
        </div>

        <h1 style={{ fontSize: 'clamp(28px, 6vw, 68px)', fontWeight: 900, lineHeight: 1.15, maxWidth: 840, marginBottom: 16 }}>
          Bharat Sevak: Your Local{' '}
          <span style={{ background: 'linear-gradient(135deg,#FF6B00,#FF8C33)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Marketplace
          </span>{' '}
          for Daily Services
        </h1>

        <p style={{ fontSize: 'clamp(14px, 2.5vw, 18px)', color: 'var(--text-secondary)', maxWidth: 620, lineHeight: 1.6, marginBottom: 32 }}>
          Bharat Sevak is a local marketplace connecting customers with nearby providers for groceries, vegetables, food, tuition, home services and repairs. Discover local products and services, place orders, choose delivery options, and track eligible deliveries.
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', width: '100%', maxWidth: 480 }}>
          <Link to="/register?role=customer" className="btn btn-primary" style={{ flex: '1 1 200px', padding: '13px 24px', fontSize: 15, justifyContent: 'center' }}>
            🛒 Shop as Customer
          </Link>
          <Link to="/register?role=provider" className="btn btn-secondary" style={{ flex: '1 1 200px', padding: '13px 24px', fontSize: 15, justifyContent: 'center' }}>
            🏪 Register as Provider
          </Link>
          <Link to="/register?role=delivery" className="btn btn-secondary" style={{ flex: '1 1 100%', padding: '11px 24px', fontSize: 14, justifyContent: 'center', border: '1px solid #3B82F6', color: '#60A5FA' }}>
            🛵 Join as Delivery / Field Technician
          </Link>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 24, marginTop: 48, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[['Daily Workers', '5000+'], ['Services Available', '200+'], ['Areas Covered', '50+']].map(([label, val]) => (
            <div key={label} style={{ textAlign: 'center', minWidth: 100 }}>
              <div style={{ fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: 800, fontFamily: 'Outfit,sans-serif', color: 'var(--saffron)' }}>{val}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Services Grid */}
      <section style={{ padding: '60px 16px', background: 'rgba(0,0,0,0.2)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 'clamp(24px, 4vw, 36px)', marginBottom: 8 }}>What We Offer</h2>
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: 32, fontSize: 14 }}>From food to home services — all your daily needs in one platform</p>
          <div className="grid-3" style={{ gap: 16 }}>
            {features.map(f => (
              <div key={f.title} className="card" style={{ textAlign: 'center', transition: 'all 0.2s', padding: '20px 16px' }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>{f.icon}</div>
                <h3 style={{ fontSize: 16, marginBottom: 6 }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section style={{ padding: '60px 16px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 'clamp(24px, 4vw, 36px)', marginBottom: 8 }}>How Bharat Sevak Works</h2>
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: 36, fontSize: 14 }}>Simple. Transparent. Built for India.</p>
          <div className="grid-4" style={{ gap: 16 }}>
            {howItWorks.map(h => (
              <div key={h.step} className="card" style={{ position: 'relative', padding: '18px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--saffron)', letterSpacing: '0.1em', marginBottom: 10 }}>STEP {h.step}</div>
                <div style={{ fontSize: 32, marginBottom: 10 }}>{h.icon}</div>
                <h3 style={{ fontSize: 15, marginBottom: 6 }}>{h.title}</h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{h.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{
        padding: '60px 16px', textAlign: 'center',
        background: 'linear-gradient(135deg, rgba(255,107,0,0.08), rgba(16,185,129,0.05))'
      }}>
        <h2 style={{ fontSize: 'clamp(22px, 3.5vw, 34px)', marginBottom: 10 }}>Ready to Join Bharat Sevak?</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 28, fontSize: 15 }}>Join thousands of providers, technicians, and customers building a better local economy</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/register" className="btn btn-primary" style={{ padding: '12px 30px', fontSize: 15 }}>Start Today →</Link>
          <Link to="/browse" className="btn btn-secondary" style={{ padding: '12px 30px', fontSize: 15 }}>Browse Services</Link>
        </div>
      </section>

      {/* Pledge preview and full terms link */}
      <section style={{ padding: '28px 16px', background: 'rgba(255,255,255,0.94)', color: '#111827' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 'clamp(22px, 3.5vw, 30px)', marginBottom: 8, color: '#111827' }}>{PLEDGE_TITLE}</h2>
          <p style={{ textAlign: 'center', color: '#374151', marginBottom: 18 }}>
            Service Is Our Religion | Humanity Is Our Identity
          </p>
          <details className="pledge-panel">
            <summary className="pledge-panel__summary">
              <span>Read the full Bharat Sevak pledge</span>
              <span className="pledge-panel__hint">10 sections · Opens here</span>
            </summary>
            <div className="pledge-scroll"><PledgeContent /></div>
          </details>
          <p style={{ textAlign: 'center', color: '#374151', marginTop: 14, fontSize: 13 }}>
            All customers, providers, delivery partners and other members must accept this pledge at sign in and registration.
          </p>
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <Link to="/pledge" className="pledge-home-link">Open the full pledge page →</Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <section aria-labelledby="bharat-sevak-about" style={{ padding: '36px 16px', background: 'rgba(0,0,0,0.16)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <h2 id="bharat-sevak-about" style={{ fontSize: 24, marginBottom: 12 }}>About Bharat Sevak</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 12 }}>
            Bharat Sevak is an India-focused local marketplace designed to help customers discover nearby products and everyday services while helping local providers reach more customers. Customers can browse available listings, compare details, place orders and select supported delivery options.
          </p>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 12 }}>
            The platform supports a range of local needs, including groceries and vegetables, food, tuition, home services, repairs and delivery. Providers can create business profiles and list eligible products or services. Delivery availability may depend on the provider's service area and destination PIN code.
          </p>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>
            Bharat Sevak's aim is to make it easier for people to find local services and support community businesses through a convenient digital platform.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 18 }}>
            <Link to="/browse" className="btn btn-secondary btn-sm">Explore local listings</Link>
            <Link to="/register?role=provider" className="btn btn-secondary btn-sm">Join as a provider</Link>
            <Link to="/register?role=customer" className="btn btn-secondary btn-sm">Create a customer account</Link>
          </div>
        </div>
      </section>
      <footer style={{ padding: '20px 16px', borderTop: '1px solid var(--navy-border)', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
        © 2026 Bharat Sevak — Local products, services and delivery across India 🇮🇳
      </footer>
    </div>
  );
}
