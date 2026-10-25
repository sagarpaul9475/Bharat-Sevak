import PledgeContent from '../../components/PledgeContent';
import '../../pledge.css';

export default function PledgePage() {
  return (
    <main style={{ minHeight: '100vh', background: '#f3f4f6', color: '#111827', padding: '32px 16px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto', background: '#fff', borderRadius: 16, padding: 'clamp(18px, 4vw, 36px)', boxShadow: '0 12px 32px rgba(17,24,39,.12)' }}>
        <PledgeContent />
      </div>
    </main>
  );
}
