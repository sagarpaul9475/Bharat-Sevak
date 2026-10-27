import React from 'react';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatDate = (value) => value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

function BrandMark() {
  return (
    <div className="receipt-brand">
      <div className="receipt-brand-mark" aria-label="Bharat Sevak logo">
        <span className="receipt-saffron" /><span className="receipt-white"><span>✦</span></span><span className="receipt-green" />
      </div>
      <div><strong>Bharat Sevak</strong><small>Service Is Our Religion · Humanity Is Our Identity</small></div>
    </div>
  );
}

export default function PrintableReceipt({ order, viewer = 'customer' }) {
  if (!order) return null;
  const isProvider = viewer === 'provider';
  const isService = order.orderType === 'service' || (order.items || []).some(item => item.itemType === 'service');
  const items = order.items || [];
  const customer = order.customer || {};
  const provider = order.provider || {};
  const ship = order.shippingAddress || {};
  const amount = Number(order.totalAmount || 0);
  const paid = order.paymentStatus === 'paid';
  const documentTitle = paid ? 'PAYMENT RECEIPT' : 'ORDER INVOICE';
  const reference = order.orderId || String(order._id || '').slice(-8).toUpperCase();
  const address = [ship.addressLine1, ship.addressLine2, ship.landmark && `Landmark: ${ship.landmark}`, ship.city, ship.district, ship.state, ship.pincode].filter(Boolean).join(', ') || order.deliveryAddress || 'Not provided';
  const print = () => {
    const oldTitle = document.title;
    document.title = `Bharat-Sevak-${paid ? 'Receipt' : 'Invoice'}-${reference}`;
    window.print();
    window.setTimeout(() => { document.title = oldTitle; }, 1000);
  };
  return (
    <div className="receipt-actions">
      <button type="button" className="btn btn-secondary" onClick={print}>🖨️ Print {paid ? 'receipt' : 'invoice'} / Save as PDF</button>
      <section className="receipt-paper" aria-label={documentTitle}>
        <header className="receipt-header">
          <BrandMark />
          <div className="receipt-title"><strong>{documentTitle}</strong><span>{isService ? 'Service booking' : 'Product order'}</span></div>
        </header>
        <div className="receipt-rule" />
        <div className="receipt-meta">
          <div><small>{isService ? 'BOOKING' : 'ORDER'} NUMBER</small><strong>{reference}</strong></div>
          <div><small>DATE</small><strong>{formatDate(order.createdAt)}</strong></div>
          <div><small>ORDER STATUS</small><strong>{String(order.status || 'pending').replaceAll('_', ' ').toUpperCase()}</strong></div>
          <div><small>PAYMENT STATUS</small><strong>{String(order.paymentStatus || 'pending').toUpperCase()}</strong></div>
        </div>
        <div className="receipt-parties">
          <div><h3>{isProvider ? 'CUSTOMER / BILL TO' : 'CUSTOMER'}</h3><strong>{ship.fullName || customer.name || 'Customer'}</strong><span>{ship.phone || customer.phone || 'Phone not provided'}</span><span>{customer.email || ''}</span><span>{address}</span></div>
          <div><h3>{isProvider ? 'ISSUED BY' : 'PROVIDER / SERVICE PROVIDER'}</h3><strong>{provider.businessName || provider.name || order.providerContact?.name || 'Bharat Sevak Provider'}</strong><span>{provider.phone || order.providerContact?.phone || ''}</span><span>{provider.email || order.providerContact?.email || ''}</span><span>{provider.address || ''}</span></div>
        </div>
        <table className="receipt-table">
          <thead><tr><th>Description</th><th>Type</th><th className="receipt-number">Qty</th><th className="receipt-number">Unit price</th><th className="receipt-number">Amount</th></tr></thead>
          <tbody>{items.map((item, index) => <tr key={item._id || index}><td>{item.itemName || 'Item'}</td><td>{item.itemType === 'service' ? 'Service' : 'Product'}</td><td className="receipt-number">{Number(item.quantity || 1)}</td><td className="receipt-number">{money(item.itemPrice)}</td><td className="receipt-number">{money(item.subtotal ?? Number(item.itemPrice || 0) * Number(item.quantity || 1))}</td></tr>)}</tbody>
        </table>
        <div className="receipt-total"><span>Total amount</span><strong>{money(amount)}</strong></div>
        <div className="receipt-payment">
          <div><small>PAYMENT METHOD</small><strong>{String(order.paymentMethod || 'cash').toUpperCase()}</strong></div>
          <div><small>PAYMENT REFERENCE</small><strong>{order.txnId || order.gatewayPaymentId || order.utrNumber || '—'}</strong></div>
          <div><small>AMOUNT {paid ? 'RECEIVED' : 'DUE'}</small><strong>{money(paid ? amount : amount)}</strong></div>
        </div>
        {order.deliveryPreference && <div className="receipt-note"><strong>Fulfilment:</strong> {order.deliveryPreference === 'post_office' ? 'Post office / postal service' : 'Delivery driver'}{order.postOfficeDetails?.trackingNumber && <> · <strong>Tracking:</strong> {order.postOfficeDetails.trackingNumber}</>}</div>}
        <footer className="receipt-footer"><strong>Thank you for choosing Bharat Sevak.</strong><span>This document was generated electronically from your Bharat Sevak order record.</span><span>{paid ? 'Payment receipt' : 'Order invoice'} · {reference}</span></footer>
      </section>
    </div>
  );
}
