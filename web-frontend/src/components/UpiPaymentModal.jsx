import { useEffect, useState } from 'react';
import { customerAPI } from '../api';
import toast from 'react-hot-toast';

// Builds UPI intent URI — works with PhonePe, Google Pay, Paytm, BHIM, Cred, etc.
function buildUpiUri({ upiId, name, amount, orderId }) {
  const pa = encodeURIComponent(upiId);
  const pn = encodeURIComponent(name || 'Bharat Sevak');
  const am = Number(amount).toFixed(2);
  const tr = encodeURIComponent(orderId || '');
  const tn = encodeURIComponent(`Payment for order ${orderId}`);
  return `upi://pay?pa=${pa}&pn=${pn}&am=${am}&tr=${tr}&tn=${tn}&cu=INR`;
}

// QR code via qrserver.com API (no npm needed)
function QRCodeImage({ value, size = 220 }) {
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&color=F59E0B&bgcolor=0F172A&margin=10`;
  return (
    <img
      src={url}
      alt="UPI QR Code"
      width={size}
      height={size}
      style={{ borderRadius: 12, border: '3px solid #F59E0B', boxShadow: '0 0 24px rgba(245,158,11,0.35)' }}
    />
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      type="button"
      onClick={copy}
      title="Copy"
      style={{
        background: copied ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.15)',
        border: `1px solid ${copied ? '#10B981' : '#F59E0B'}`,
        borderRadius: 6, padding: '2px 10px', fontSize: 12, cursor: 'pointer',
        color: copied ? '#10B981' : '#F59E0B', transition: 'all 0.2s', flexShrink: 0,
      }}
    >
      {copied ? '✅ Copied' : '📋 Copy'}
    </button>
  );
}

export default function UpiPaymentModal({ order, onClose, onPaymentSubmitted }) {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState('qr'); // 'qr' | 'confirm'
  const [utrNumber, setUtrNumber] = useState('');
  const [payerPhone, setPayerPhone] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    customerAPI.getPaymentInfo(order._id)
      .then(r => setInfo(r.data))
      .catch(() => toast.error('Could not load payment info'))
      .finally(() => setLoading(false));
  }, [order._id]);

  const provider = info?.provider;
  const upiId = provider?.upiDetails?.upiId;
  const upiPhone = provider?.upiDetails?.upiPhone;
  const upiName = provider?.upiDetails?.upiName || provider?.businessName || provider?.name;
  const totalAmount = info?.totalAmount || order?.totalAmount;
  const orderId = info?.orderId || order?.orderId;
  const hasUpi = upiId || upiPhone;
  const primaryUpiId = upiId || (upiPhone ? `${upiPhone}@ybl` : null);

  const upiUri = primaryUpiId
    ? buildUpiUri({ upiId: primaryUpiId, name: upiName, amount: totalAmount, orderId })
    : null;

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (!utrNumber.trim() || utrNumber.trim().length < 6) {
      toast.error('Please enter a valid UTR / Transaction Reference (min 6 characters)');
      return;
    }
    setSubmitting(true);
    try {
      const res = await customerAPI.submitPayment(order._id, {
        utrNumber: utrNumber.trim(), payerPhone, paymentNote
      });
      toast.success(res.data?.message || 'Payment reference submitted! Provider will confirm soon.');
      onPaymentSubmitted?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit payment reference');
    } finally {
      setSubmitting(false);
    }
  };

  const infoRow = (label, value, copyable = false) => (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 12px', background: 'rgba(255,255,255,0.04)',
      borderRadius: 8, marginBottom: 6, gap: 8, flexWrap: 'wrap'
    }}>
      <span style={{ fontSize: 12, color: '#94A3B8', flexShrink: 0 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#F1F5F9', textAlign: 'right', wordBreak: 'break-all' }}>{value || '\u2014'}</span>
        {copyable && value && <CopyButton text={value} />}
      </div>
    </div>
  );

  return (
    <div
      className="modal-overlay"
      style={{ zIndex: 11000, backdropFilter: 'blur(6px)' }}
      onClick={(e) => e.target.classList.contains('modal-overlay') && onClose()}
    >
      <div className="modal-box" style={{ maxWidth: 500, padding: 0, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(255,107,0,0.1))',
          borderBottom: '1px solid rgba(245,158,11,0.3)',
          padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 12
        }}>
          <div style={{ fontSize: 32 }}>💳</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 17 }}>UPI / QR Payment</div>
            <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
              Order #{orderId} · Pay via PhonePe, GPay, Paytm or any UPI app
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: 22, cursor: 'pointer', lineHeight: 1, flexShrink: 0 }}
          >x</button>
        </div>

        <div style={{ padding: '20px 24px', maxHeight: '80vh', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <div className="spinner" />
              <div style={{ marginTop: 12, color: '#94A3B8', fontSize: 14 }}>Loading payment details...</div>
            </div>
          ) : (
            <>
              {/* Amount Banner */}
              <div style={{
                textAlign: 'center', marginBottom: 20,
                background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(255,107,0,0.08))',
                border: '2px solid rgba(245,158,11,0.4)', borderRadius: 12, padding: '14px 20px'
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#F59E0B', marginBottom: 4 }}>
                  Amount to Pay
                </div>
                <div style={{ fontSize: 42, fontWeight: 900, color: '#F59E0B', lineHeight: 1 }}>
                  Rs.{totalAmount}
                </div>
                <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>Order #{orderId}</div>
              </div>

              {/* Step Tabs */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
                {[
                  { key: 'qr', label: '📱 Step 1: Scan & Pay' },
                  { key: 'confirm', label: '✅ Step 2: Submit Ref.' }
                ].map(s => (
                  <button
                    key={s.key}
                    onClick={() => setStep(s.key)}
                    style={{
                      flex: 1, padding: '9px 8px', borderRadius: 8, fontWeight: 700,
                      fontSize: 12, cursor: 'pointer', transition: 'all 0.2s',
                      background: step === s.key ? '#F59E0B' : 'rgba(255,255,255,0.06)',
                      color: step === s.key ? '#0F172A' : '#94A3B8',
                      border: step === s.key ? '2px solid #F59E0B' : '2px solid transparent',
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* STEP 1: QR & Pay */}
              {step === 'qr' && (
                <div>
                  {!hasUpi ? (
                    <div style={{
                      textAlign: 'center', padding: '30px 20px',
                      background: 'rgba(245,158,11,0.08)', borderRadius: 12,
                      border: '1px solid rgba(245,158,11,0.2)', marginBottom: 16
                    }}>
                      <div style={{ fontSize: 36, marginBottom: 10 }}>⚠️</div>
                      <div style={{ fontWeight: 700, marginBottom: 6 }}>UPI not configured</div>
                      <div style={{ fontSize: 13, color: '#94A3B8' }}>
                        The provider has not set up their UPI/QR details yet. Please contact them via phone number below.
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* QR Code */}
                      <div style={{ textAlign: 'center', marginBottom: 20 }}>
                        <QRCodeImage value={upiUri} size={210} />
                        <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 10 }}>
                          📷 Open any UPI app → Scan QR → Pay Rs.{totalAmount}
                        </div>
                      </div>

                      {/* UPI App Buttons */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 }}>
                        {[
                          {
                            label: 'PhonePe', icon: '💜',
                            link: `phonepe://pay?pa=${encodeURIComponent(primaryUpiId)}&pn=${encodeURIComponent(upiName || '')}&am=${totalAmount}&tr=${orderId}&cu=INR`
                          },
                          {
                            label: 'Google Pay', icon: '🎨',
                            link: `tez://upi/pay?pa=${encodeURIComponent(primaryUpiId)}&pn=${encodeURIComponent(upiName || '')}&am=${totalAmount}&cu=INR`
                          },
                          {
                            label: 'Paytm', icon: '🔷',
                            link: `paytmmp://pay?pa=${encodeURIComponent(primaryUpiId)}&pn=${encodeURIComponent(upiName || '')}&am=${totalAmount}&cu=INR`
                          },
                          { label: 'BHIM/UPI', icon: '🇮🇳', link: upiUri },
                        ].map(app => (
                          <a
                            key={app.label}
                            href={app.link}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              padding: '12px 6px', textAlign: 'center',
                              background: 'rgba(255,255,255,0.07)', borderRadius: 10,
                              border: '1px solid rgba(255,255,255,0.1)',
                              fontSize: 11, fontWeight: 700, color: '#F1F5F9',
                              textDecoration: 'none', transition: 'all 0.2s',
                              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6
                            }}
                          >
                            <span style={{ fontSize: 22 }}>{app.icon}</span>
                            {app.label}
                          </a>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Provider Contact & Payment Info */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{
                      fontSize: 11, fontWeight: 800, textTransform: 'uppercase',
                      letterSpacing: 1, color: '#64748B', marginBottom: 8
                    }}>
                      📞 Provider Contact & Payment Details
                    </div>
                    {infoRow('Provider Name', upiName)}
                    {infoRow('Phone (Call / WhatsApp)', provider?.phone, true)}
                    {upiId && infoRow('UPI ID / VPA', upiId, true)}
                    {upiPhone && infoRow('UPI-linked Mobile', upiPhone, true)}

                    {provider?.bankDetails?.accountNumber && (
                      <>
                        <div style={{
                          fontSize: 11, fontWeight: 800, textTransform: 'uppercase',
                          letterSpacing: 1, color: '#64748B', margin: '12px 0 8px'
                        }}>
                          🏦 Bank Account (NEFT / IMPS)
                        </div>
                        {infoRow('Account Holder', provider.bankDetails.accountHolderName)}
                        {infoRow('Account Number', provider.bankDetails.accountNumber, true)}
                        {infoRow('IFSC Code', provider.bankDetails.ifscCode, true)}
                        {infoRow('Bank Name', provider.bankDetails.bankName)}
                      </>
                    )}
                  </div>

                  <button
                    className="btn btn-primary w-full"
                    onClick={() => setStep('confirm')}
                    style={{ fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  >
                    I've Paid — Enter Transaction Reference →
                  </button>
                </div>
              )}

              {/* STEP 2: Submit UTR */}
              {step === 'confirm' && (
                <form onSubmit={handleSubmitPayment}>
                  <div style={{
                    background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)',
                    borderRadius: 10, padding: 14, marginBottom: 18, fontSize: 13
                  }}>
                    💡 After completing the UPI payment, enter the <strong>Transaction ID / UTR number</strong> from your UPI app. The provider will verify and confirm the payment.
                  </div>

                  <div className="form-group" style={{ marginBottom: 14 }}>
                    <label className="form-label">
                      UTR / Transaction Reference Number <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      className="form-input"
                      value={utrNumber}
                      onChange={e => setUtrNumber(e.target.value)}
                      placeholder="e.g. 123456789012 (from UPI app)"
                      required
                      minLength={6}
                      style={{ fontFamily: 'monospace', letterSpacing: 2, fontSize: 15 }}
                    />
                    <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
                      Find this in your PhonePe / GPay / Paytm payment history
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 14 }}>
                    <label className="form-label">Your UPI-linked Mobile Number (optional)</label>
                    <input
                      className="form-input"
                      value={payerPhone}
                      onChange={e => setPayerPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                      inputMode="tel"
                      maxLength={10}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 18 }}>
                    <label className="form-label">Note (optional)</label>
                    <input
                      className="form-input"
                      value={paymentNote}
                      onChange={e => setPaymentNote(e.target.value)}
                      placeholder="Any additional information for the provider"
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ flex: 1 }}
                      onClick={() => setStep('qr')}
                    >
                      Back to QR
                    </button>
                    <button
                      type="submit"
                      className="btn btn-success"
                      style={{ flex: 2, fontWeight: 700 }}
                      disabled={submitting || utrNumber.trim().length < 6}
                    >
                      {submitting ? 'Submitting...' : 'Submit Payment Reference'}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
