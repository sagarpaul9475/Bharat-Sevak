import { useEffect, useState } from 'react';
import { customerAPI, paymentAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function CustomerBrowse() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('products');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);

  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);

  const load = () => {
    setLoading(true);
    const apiCall = tab === 'products'
      ? customerAPI.getProducts({ search })
      : customerAPI.getServices({ search });
    apiCall
      .then(r => setItems(tab === 'products' ? r.data.products : r.data.services))
      .catch(() => toast.error('Failed to load items'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [tab]);
  useEffect(() => {
    const timer = setTimeout(load, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const addToCart = (item) => {
    if (!user) {
      toast.error('Please login to order');
      navigate('/login');
      return;
    }

    const providerId = item.provider?._id;
    if (!providerId) {
      toast.error('This listing has no provider');
      return;
    }

    if (cart.length > 0 && cart[0].providerId !== providerId) {
      toast.error('You can only order from one provider at a time. Please checkout or clear cart first.');
      return;
    }

    setCart(prev => {
      const existing = prev.find(i => i.item === item._id);
      if (existing) {
        return prev.map(i => i.item === item._id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, {
        itemType: tab === 'products' ? 'product' : 'service',
        item: item._id,
        itemName: item.name,
        itemPrice: tab === 'products' ? item.price : item.rate,
        quantity: 1,
        providerId,
        providerName: item.provider.businessName || item.provider.name,
      }];
    });
    toast.success('Added to cart');
  };

  const openDetails = (item) => {
    setSelectedItem(item);
    setSelectedImage(0);
  };

  const updateQty = (itemId, newQty) => {
    if (newQty < 1 || isNaN(newQty)) return;
    setCart(prev => prev.map(i => i.item === itemId ? { ...i, quantity: newQty } : i));
  };

  const removeFromCart = (itemId) => {
    setCart(prev => prev.filter(i => i.item !== itemId));
    toast.success('Item removed from cart');
  };

  const startOnlinePayment = async (orderId) => {
    try {
      const { data: paymentOrder } = await paymentAPI.createOrder(orderId);
      if (!window.Razorpay) {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = () => reject(new Error('Could not load the payment window. Check your internet connection.'));
        });
      }

      const checkout = new window.Razorpay({
        key: paymentOrder.keyId,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency,
        name: 'Bharat Sevak',
        description: 'Order payment',
        order_id: paymentOrder.gatewayOrderId,
        handler: async (response) => {
          try {
            await paymentAPI.verifyOrder(orderId, response);
            toast.success('Payment verified successfully!');
          } catch (error) {
            toast.error(error.response?.data?.message || 'Payment verification is pending. Check My Orders before paying again.');
          } finally {
            navigate('/orders');
          }
        },
        modal: {
          ondismiss: () => {
            toast('Your order is saved. You can retry payment from My Orders.');
            navigate('/orders');
          },
        },
        theme: { color: '#F59E0B' },
      });
      checkout.on('payment.failed', (response) => {
        toast.error(response.error?.description || 'Payment failed. You can retry from My Orders.');
      });
      checkout.open();
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Could not start online payment');
      navigate('/orders');
    }
  };

  const placeOrder = async (paymentMethod = 'cash') => {
    if (cart.length === 0) return;
    setPlacingOrder(true);
    try {
      const { data: order } = await customerAPI.placeOrder({
        items: cart.map(({ itemType, item, quantity }) => ({ itemType, item, quantity })),
        paymentMethod,
        deliveryAddress: user.address || 'My Default Address',
      });
      setCart([]);
      setShowCart(false);
      if (paymentMethod === 'online') {
        toast.success('Order created. Complete payment in the secure checkout.');
        await startOnlinePayment(order._id);
      } else {
        toast.success('Order placed successfully!');
        navigate('/orders');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to place order');
    } finally {
      setPlacingOrder(false);
    }
  };

  const cartTotal = cart.reduce((sum, i) => sum + (i.itemPrice * i.quantity), 0);
  const isProduct = tab === 'products';
  const selectedImages = selectedItem?.images || [];

  return (
    <div className="animate-fade relative">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="page-title">🛍️ Explore Local Services & Products</h1>
          <p className="page-subtitle">Support daily workers in your community</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCart(true)}>
          🛒 Cart {cart.length > 0 && <span className="nav-badge" style={{ background: 'white', color: 'var(--saffron)' }}>{cart.length}</span>}
        </button>
      </div>

      <div className="card mb-6 browse-toolbar">
        <div className="search-wrap" style={{ flex: 1 }}>
          <span className="search-icon">🔍</span>
          <input className="form-input" placeholder="Search by name, category, or tags..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="tabs">
          <button className={`tab-btn ${tab === 'products' ? 'active' : ''}`} onClick={() => setTab('products')}>📦 Products</button>
          <button className={`tab-btn ${tab === 'services' ? 'active' : ''}`} onClick={() => setTab('services')}>🛠️ Services</button>
        </div>
      </div>

      {loading ? <div className="loading-center"><div className="spinner" /></div> : (
        items.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">🔍</div><div className="empty-title">No items found</div></div>
        ) : (
          <div className="grid-4">
            {items.map(item => {
              const cover = item.images?.[0];
              const ratingAvailable = typeof item.rating === 'number' && item.rating > 0;
              return (
                <div key={item._id} className="product-card customer-product-card">
                  {cover ? (
                    <div className="customer-card-media">
                      <img className="product-img" src={cover} alt={item.name} />
                      {item.videoUrl && <span className="media-chip">🎬 Video</span>}
                      {item.images?.length > 1 && <span className="media-chip media-count">📷 {item.images.length}</span>}
                    </div>
                  ) : (
                    <div className="product-img">{item.name?.[0]?.toUpperCase() || '📦'}</div>
                  )}
                  <div className="product-body">
                    <h3 className="product-name truncate" title={item.name}>{item.name}</h3>
                    <div className="text-xs text-muted mb-2 truncate">
                      By {item.provider?.businessName || item.provider?.name || 'Local provider'}
                    </div>
                    {ratingAvailable && (
                      <div className="rating-line mb-2">★ {item.rating.toFixed(1)}{item.ratingCount ? ` · ${item.ratingCount} ratings` : ''}</div>
                    )}
                    <div className="product-price mb-2">
                      ₹{isProduct ? item.price : item.rate}
                      <span className="text-xs text-muted font-normal"> / {isProduct ? item.unit : item.rateUnit}</span>
                    </div>
                    <div className="text-xs text-muted mb-3">
                      📍 {[item.provider?.region?.area, item.provider?.region?.district].filter(Boolean).join(', ') || 'Local area'}
                    </div>
                    <div className="flex gap-2">
                      <button className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => openDetails(item)}>
                        View Details
                      </button>
                      <button className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => addToCart(item)}>
                        Buy
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {selectedItem && (
        <div className="modal-overlay" onClick={(e) => e.target.classList.contains('modal-overlay') && setSelectedItem(null)}>
          <div className="modal-box wide product-details-modal">
            <div className="modal-head">
              <h2>{selectedItem.name}</h2>
              <button className="btn-icon btn-secondary" onClick={() => setSelectedItem(null)}>✕</button>
            </div>

            <div className="product-details-grid">
              <div>
                {selectedImages.length > 0 ? (
                  <>
                    <div className="details-cover">
                      <img src={selectedImages[selectedImage]} alt={selectedItem.name} />
                    </div>
                    <div className="details-thumbnails">
                      {selectedImages.map((url, index) => (
                        <button key={url} type="button" className={index === selectedImage ? 'active' : ''} onClick={() => setSelectedImage(index)}>
                          <img src={url} alt="" />
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="details-cover details-placeholder">{selectedItem.name?.[0]?.toUpperCase() || '📦'}</div>
                )}

                {isProduct && selectedItem.videoUrl && (
                  <div className="details-video mt-4">
                    <div className="form-label mb-2">Product video</div>
                    <video src={selectedItem.videoUrl} controls playsInline preload="metadata" />
                  </div>
                )}
              </div>

              <div className="product-details-copy">
                <div className="text-sm text-muted mb-2">
                  By <strong>{selectedItem.provider?.businessName || selectedItem.provider?.name}</strong>
                </div>
                {typeof selectedItem.rating === 'number' && selectedItem.rating > 0 && (
                  <div className="rating-line mb-3">★ {selectedItem.rating.toFixed(1)}{selectedItem.ratingCount ? ` · ${selectedItem.ratingCount} ratings` : ''}</div>
                )}
                <div className="product-price text-2xl mb-4">
                  ₹{isProduct ? selectedItem.price : selectedItem.rate}
                  <span className="text-xs text-muted font-normal"> / {isProduct ? selectedItem.unit : selectedItem.rateUnit}</span>
                </div>
                <p className="text-muted" style={{ lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{selectedItem.description || 'No description provided.'}</p>
                {isProduct && selectedItem.stock !== undefined && (
                  <div className="text-sm mt-4">Stock: <strong>{selectedItem.stock}</strong> {selectedItem.unit}</div>
                )}
                <button className="btn btn-primary w-full justify-center mt-6" onClick={() => { addToCart(selectedItem); setSelectedItem(null); }}>
                  🛒 Buy / Add to Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCart && (
        <div className="modal-overlay" style={{ justifyContent: 'flex-end', padding: 0 }} onClick={(e) => e.target.classList.contains('modal-overlay') && setShowCart(false)}>
          <div className="modal-box" style={{ width: 400, height: '100vh', borderRadius: 0, margin: 0, display: 'flex', flexDirection: 'column' }}>
            <div className="modal-head"><h2>🛒 Your Cart</h2><button className="btn-icon btn-secondary" onClick={() => setShowCart(false)}>✕</button></div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {cart.length === 0 ? <div className="empty-state"><div className="empty-icon">🛒</div><div className="empty-title">Cart is empty</div></div> : (
                <>
                  <div className="text-sm font-bold text-saffron mb-3">Ordering from: {cart[0].providerName}</div>
                  {cart.map(i => (
                    <div key={i.item} className="p-3 mb-2 rounded bg-navy border border-navy-border">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-bold" style={{ flex: 1, marginRight: 8 }}>{i.itemName}</div>
                        <button onClick={() => removeFromCart(i.item)} style={{ background: 'rgba(239,68,68,0.15)', border: 'none', color: '#EF4444', borderRadius: 6, padding: '2px 8px', cursor: 'pointer', fontSize: 13, flexShrink: 0 }}>✕ Remove</button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center" style={{ border: '1.5px solid var(--navy-border)', borderRadius: 8, overflow: 'hidden' }}>
                          <button onClick={() => updateQty(i.item, i.quantity - 1)} style={{ background: 'var(--navy-border)', border: 'none', color: 'var(--text-primary)', width: 32, height: 32, fontSize: 16, cursor: 'pointer' }}>−</button>
                          <input type="number" min="1" value={i.quantity} onChange={e => updateQty(i.item, Number(e.target.value))} style={{ width: 52, textAlign: 'center', background: 'transparent', border: 'none', color: 'var(--text-primary)', fontWeight: 700, fontSize: 15, outline: 'none', padding: 0 }} />
                          <button onClick={() => updateQty(i.item, i.quantity + 1)} style={{ background: 'var(--navy-border)', border: 'none', color: 'var(--text-primary)', width: 32, height: 32, fontSize: 16, cursor: 'pointer' }}>+</button>
                        </div>
                        <div className="font-bold text-saffron">₹{i.itemPrice * i.quantity}</div>
                      </div>
                      <div className="text-xs text-muted" style={{ marginTop: 4 }}>₹{i.itemPrice} × {i.quantity} {i.quantity > 1 ? 'units' : 'unit'}</div>
                    </div>
                  ))}
                </>
              )}
            </div>

            {cart.length > 0 && (
              <div style={{ borderTop: '1px solid var(--navy-border)', paddingTop: 16, marginTop: 16 }}>
                <div className="flex justify-between items-center mb-4"><span className="font-bold">Total:</span><span className="font-bold text-xl text-saffron">₹{cartTotal}</span></div>
                <div className="text-xs text-muted mb-3">Choose cash on delivery or pay securely online by UPI, card, or net banking.</div>
                <div className="flex flex-col gap-2">
                  <button className="btn btn-success w-full justify-center py-3 text-lg" onClick={() => placeOrder('cash')} disabled={placingOrder}>{placingOrder ? '⏳ Processing...' : 'Place Order · Cash'}</button>
                  <button className="btn btn-primary w-full justify-center py-3 text-lg" onClick={() => placeOrder('online')} disabled={placingOrder}>{placingOrder ? '⏳ Processing...' : 'Pay Online'}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
