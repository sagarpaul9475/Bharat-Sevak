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

  // Search & Filter states
  const [search, setSearch] = useState('');
  const [providerName, setProviderName] = useState('');
  const [selectedMenu, setSelectedMenu] = useState('');
  const [selectedApprovedProduct, setSelectedApprovedProduct] = useState('');
  const [pincode, setPincode] = useState(user?.region?.pincode || '');

  // Dropdown options
  const [menus, setMenus] = useState([]);
  const [approvedProducts, setApprovedProducts] = useState([]);
  const [approvedProviders, setApprovedProviders] = useState([]);
  const [postOfficeCharge, setPostOfficeCharge] = useState(50);

  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);

  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [deliveryPincode, setDeliveryPincode] = useState(user?.region?.pincode || '');
  const [shipping, setShipping] = useState({
    fullName: user?.name || '',
    phone: user?.phone || '',
    addressLine1: user?.address || '',
    addressLine2: '',
    landmark: '',
    city: user?.region?.area || '',
    district: user?.region?.district || '',
    state: user?.region?.state || '',
    locationInstructions: '',
    latitude: '',
    longitude: ''
  });
  const [deliveryPreference, setDeliveryPreference] = useState('delivery_driver');

  // Load dropdown lists and delivery charge
  useEffect(() => {
    customerAPI.getMenus().then(r => setMenus(r.data || [])).catch(() => {});
    customerAPI.getApprovedProductsDropdown().then(r => setApprovedProducts(r.data || [])).catch(() => {});
    customerAPI.getApprovedProvidersDropdown().then(r => setApprovedProviders(r.data || [])).catch(() => {});
    customerAPI.getDeliveryCharges().then(r => {
      if (typeof r.data?.postOfficeCharge === 'number') {
        setPostOfficeCharge(r.data.postOfficeCharge);
      }
    }).catch(() => {});
  }, []);

  const load = () => {
    setLoading(true);
    const params = {
      search: search.trim(),
      pincode: pincode.trim(),
      category: selectedMenu,
      providerName: providerName.trim(),
      productName: selectedApprovedProduct,
    };

    const apiCall = tab === 'products'
      ? customerAPI.getProducts(params)
      : customerAPI.getServices({
          search: search.trim(),
          pincode: pincode.trim(),
          providerName: providerName.trim(),
          serviceType: selectedMenu
        });

    apiCall
      .then(r => setItems(tab === 'products' ? r.data.products : r.data.services))
      .catch(() => toast.error('Failed to load items'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [tab, selectedMenu, selectedApprovedProduct]);
  useEffect(() => { const timer = setTimeout(load, 350); return () => clearTimeout(timer); }, [pincode]);
  useEffect(() => {
    const timer = setTimeout(load, 450);
    return () => clearTimeout(timer);
  }, [search, providerName]);

  const clearFilters = () => {
    setSearch('');
    setProviderName('');
    setSelectedMenu('');
    setSelectedApprovedProduct('');
    setPincode(user?.region?.pincode || '');
  };

  const hasActiveFilters = Boolean(
    search || providerName || selectedMenu || selectedApprovedProduct || (pincode && pincode !== (user?.region?.pincode || ''))
  );

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
    if (!/^\d{6}$/.test(deliveryPincode.trim())) { toast.error('Enter a valid 6-digit delivery PIN code'); return; }
    setPlacingOrder(true);
    try {
      const { data: order } = await customerAPI.placeOrder({
        items: cart.map(({ itemType, item, quantity }) => ({ itemType, item, quantity })),
        paymentMethod,
        deliveryAddress: user.address || 'My Default Address',
        deliveryPincode: deliveryPincode.trim(),
        shippingAddress: {
          ...shipping,
          pincode: deliveryPincode.trim(),
          latitude: shipping.latitude === '' ? undefined : Number(shipping.latitude),
          longitude: shipping.longitude === '' ? undefined : Number(shipping.longitude)
        },
        deliveryPreference,
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
  const finalCartTotal = deliveryPreference === 'post_office' ? cartTotal + postOfficeCharge : cartTotal;
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

      {/* Main Search & Comprehensive Filter Controls */}
      <div className="card mb-6" style={{ padding: '18px 20px' }}>
        {/* Row 1: Search keyword and Products vs Services Tabs */}
        <div className="flex gap-3 mb-3" style={{ flexWrap: 'wrap' }}>
          <div className="search-wrap" style={{ flex: '1 1 300px' }}>
            <span className="search-icon">🔍</span>
            <input
              className="form-input"
              placeholder="Search by product name, category, or tags..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="tabs" style={{ margin: 0 }}>
            <button className={`tab-btn ${tab === 'products' ? 'active' : ''}`} onClick={() => { setTab('products'); setSelectedApprovedProduct(''); }}>
              📦 Products
            </button>
            <button className={`tab-btn ${tab === 'services' ? 'active' : ''}`} onClick={() => { setTab('services'); setSelectedApprovedProduct(''); }}>
              🛠️ Services
            </button>
          </div>
        </div>

        {/* Row 2: Search by Provider, Filter by Menu (Category), Approved Products Dropdown, PIN code */}
        <div className="grid-4" style={{ gap: 12, alignItems: 'end' }}>
          {/* a. Search by Provider Name */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: 12 }}>🏪 Provider Name</label>
            <input
              list="approved-provider-datalist"
              className="form-input"
              placeholder="Type or pick provider..."
              value={providerName}
              onChange={e => setProviderName(e.target.value)}
            />
            <datalist id="approved-provider-datalist">
              {approvedProviders.map(p => (
                <option key={p._id} value={p.businessName || p.name} />
              ))}
            </datalist>
          </div>

          {/* b. Search by Menu / Category Dropdown */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: 12 }}>📁 Menu / Category</label>
            <select
              className="form-select"
              value={selectedMenu}
              onChange={e => { setSelectedMenu(e.target.value); setSelectedApprovedProduct(''); }}
            >
              <option value="">All Menus / Categories</option>
              {menus.map(m => (
                <option key={m._id} value={m._id}>
                  {m.icon || '📁'} {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* b. Dropdown of Approved Products (approved by Admin) */}
          {isProduct ? (
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: 12 }}>✅ Approved Products</label>
              <select
                className="form-select"
                value={selectedApprovedProduct}
                onChange={e => setSelectedApprovedProduct(e.target.value)}
              >
                <option value="">All Approved Products</option>
                {approvedProducts.map(p => (
                  <option key={p._id} value={p.name}>
                    {p.name} (₹{p.price}/{p.unit || 'unit'})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: 12 }}>📍 Delivery PIN Code</label>
              <input
                className="form-input"
                inputMode="numeric"
                maxLength={6}
                placeholder="6-digit PIN code"
                value={pincode}
                onChange={e => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              />
            </div>
          )}

          {/* Action Row: PIN Code (for products) & Reset Filters */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {isProduct && (
              <div style={{ flex: 1 }}>
                <label className="form-label" style={{ fontSize: 12 }}>📍 PIN Code</label>
                <input
                  className="form-input"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="6-digit PIN"
                  value={pincode}
                  onChange={e => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                />
              </div>
            )}
            {hasActiveFilters && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={clearFilters}
                style={{ height: 40, marginTop: 'auto', whiteSpace: 'nowrap' }}
                title="Reset all search & filter fields"
              >
                🔄 Reset
              </button>
            )}
          </div>
        </div>

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <div className="flex gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--navy-border)', flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="text-xs text-muted">Active filters:</span>
            {search && <span className="badge badge-info text-xs">Search: "{search}"</span>}
            {providerName && <span className="badge badge-pending text-xs">Provider: {providerName}</span>}
            {selectedMenu && (
              <span className="badge badge-info text-xs">
                Category: {menus.find(m => m._id === selectedMenu)?.name || 'Selected'}
              </span>
            )}
            {selectedApprovedProduct && (
              <span className="badge badge-approved text-xs">Product: {selectedApprovedProduct}</span>
            )}
            {pincode && <span className="badge badge-info text-xs">PIN: {pincode}</span>}
          </div>
        )}
      </div>

      {loading ? <div className="loading-center"><div className="spinner" /></div> : (
        items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <div className="empty-title">No items found</div>
            <p className="text-muted text-sm mt-1">Try adjusting your provider, menu, or search filters.</p>
            {hasActiveFilters && (
              <button className="btn btn-secondary btn-sm mt-3" onClick={clearFilters}>
                Clear All Filters
              </button>
            )}
          </div>
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
                      By <strong>{item.provider?.businessName || item.provider?.name || 'Local provider'}</strong>
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

      {/* Cart & Checkout Modal */}
      {showCart && (
        <div className="modal-overlay" style={{ justifyContent: 'flex-end', padding: 0 }} onClick={(e) => e.target.classList.contains('modal-overlay') && setShowCart(false)}>
          <div className="modal-box" style={{ width: 'min(450px, 100vw)', height: '100vh', borderRadius: 0, margin: 0, display: 'flex', flexDirection: 'column' }}>
            <div className="modal-head">
              <h2>🛒 Your Cart</h2>
              <button className="btn-icon btn-secondary" onClick={() => setShowCart(false)}>✕</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              <div className="p-3">
                <h3 className="font-bold mb-2">Shipping address</h3>
                <label className="form-label">Recipient full name *
                  <input className="form-input mt-1" value={shipping.fullName} onChange={e => setShipping({ ...shipping, fullName: e.target.value })} required />
                </label>
                <label className="form-label">Contact phone *
                  <input className="form-input mt-1" inputMode="tel" value={shipping.phone} onChange={e => setShipping({ ...shipping, phone: e.target.value })} required />
                </label>
                <label className="form-label">House / street / address line 1 *
                  <input className="form-input mt-1" value={shipping.addressLine1} onChange={e => setShipping({ ...shipping, addressLine1: e.target.value })} required />
                </label>
                <label className="form-label">Address line 2
                  <input className="form-input mt-1" value={shipping.addressLine2} onChange={e => setShipping({ ...shipping, addressLine2: e.target.value })} />
                </label>
                <label className="form-label">Landmark
                  <input className="form-input mt-1" value={shipping.landmark} onChange={e => setShipping({ ...shipping, landmark: e.target.value })} />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="form-label">City / town *
                    <input className="form-input mt-1" value={shipping.city} onChange={e => setShipping({ ...shipping, city: e.target.value })} required />
                  </label>
                  <label className="form-label">District
                    <input className="form-input mt-1" value={shipping.district} onChange={e => setShipping({ ...shipping, district: e.target.value })} />
                  </label>
                  <label className="form-label">State *
                    <input className="form-input mt-1" value={shipping.state} onChange={e => setShipping({ ...shipping, state: e.target.value })} required />
                  </label>
                  <label className="form-label">PIN code *
                    <input className="form-input mt-1" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={deliveryPincode} onChange={e => setDeliveryPincode(e.target.value.replace(/\D/g, '').slice(0, 6))} required />
                  </label>
                </div>
                <label className="form-label">Delivery instructions
                  <input className="form-input mt-1" placeholder="Gate, floor, best time to call" value={shipping.locationInstructions} onChange={e => setShipping({ ...shipping, locationInstructions: e.target.value })} />
                </label>
                <button type="button" className="btn btn-secondary mb-3" onClick={() => { if (!navigator.geolocation) { toast.error('Location is not supported'); return; } navigator.geolocation.getCurrentPosition(pos => setShipping(s => ({ ...s, latitude: String(pos.coords.latitude), longitude: String(pos.coords.longitude) })), () => toast.error('Could not access location. Check browser permission.'), { enableHighAccuracy: true, timeout: 10000 }); }}>📍 Use current location (optional)</button>
                {shipping.latitude && shipping.longitude && <p className="text-xs text-muted">Location saved: {Number(shipping.latitude).toFixed(5)}, {Number(shipping.longitude).toFixed(5)}</p>}
                {shipping.addressLine1 && shipping.city && <a className="btn btn-secondary mb-3" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([shipping.addressLine1, shipping.addressLine2, shipping.landmark, shipping.city, shipping.district, shipping.state, deliveryPincode].filter(Boolean).join(', '))}`} target="_blank" rel="noreferrer">🗺️ Preview delivery address in Google Maps</a>}

                <h3 className="font-bold mt-3 mb-2">Preferred delivery method</h3>
                <label className="flex items-start gap-2 mb-2 p-2 rounded cursor-pointer" style={{ background: deliveryPreference === 'delivery_driver' ? 'rgba(245,158,11,0.1)' : 'var(--navy)', border: `1px solid ${deliveryPreference === 'delivery_driver' ? 'var(--saffron)' : 'var(--navy-border)'}` }}>
                  <input type="radio" name="deliveryPreference" value="delivery_driver" checked={deliveryPreference === 'delivery_driver'} onChange={() => setDeliveryPreference('delivery_driver')} style={{ marginTop: 4 }} />
                  <div style={{ flex: 1 }}>
                    <div className="font-bold text-sm">🛵 Delivery Driver (Standard Partner)</div>
                    <small className="text-muted">For local destinations covered by nearby delivery driver.</small>
                  </div>
                  <span className="text-xs font-bold text-emerald">Free</span>
                </label>

                <label className="flex items-start gap-2 p-2 rounded cursor-pointer" style={{ background: deliveryPreference === 'post_office' ? 'rgba(245,158,11,0.1)' : 'var(--navy)', border: `1px solid ${deliveryPreference === 'post_office' ? 'var(--saffron)' : 'var(--navy-border)'}` }}>
                  <input type="radio" name="deliveryPreference" value="post_office" checked={deliveryPreference === 'post_office'} onChange={() => setDeliveryPreference('post_office')} style={{ marginTop: 4 }} />
                  <div style={{ flex: 1 }}>
                    <div className="font-bold text-sm">📮 Post Office / Postal Service</div>
                    <small className="text-muted">Recommended for cross-city orders. Provider coordinates postage and records dispatch tracking.</small>
                  </div>
                  <span className="badge badge-pending text-xs" style={{ whiteSpace: 'nowrap' }}>+₹{postOfficeCharge}</span>
                </label>

                {deliveryPreference === 'post_office' && (
                  <div className="p-3 rounded mt-2 text-xs" style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: '#FCD34D' }}>
                    📮 <strong>Post Office Delivery Charge:</strong> An official postal fee of <strong>₹{postOfficeCharge}</strong> is added to your order. The provider will dispatch through the post office and provide a tracking receipt.
                  </div>
                )}
              </div>

              {cart.length === 0 ? <div className="empty-state"><div className="empty-icon">🛒</div><div className="empty-title">Cart is empty</div></div> : (
                <div className="p-3">
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
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div style={{ borderTop: '1px solid var(--navy-border)', padding: 16 }}>
                {/* Cost Breakdown */}
                <div className="mb-3 p-3 rounded" style={{ background: 'var(--navy)', border: '1px solid var(--navy-border)' }}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted">Items Subtotal:</span>
                    <span className="font-semibold">₹{cartTotal}</span>
                  </div>
                  {deliveryPreference === 'post_office' ? (
                    <div className="flex justify-between text-sm text-saffron mb-1">
                      <span>📮 Post Office Delivery Charge:</span>
                      <span className="font-bold">+₹{postOfficeCharge}</span>
                    </div>
                  ) : (
                    <div className="flex justify-between text-sm text-emerald mb-1">
                      <span>🛵 Delivery Driver Charge:</span>
                      <span className="font-semibold">Included / Free</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 mt-2" style={{ borderTop: '1px solid var(--navy-border)' }}>
                    <span className="font-bold">Total Amount:</span>
                    <span className="font-bold text-2xl text-saffron">₹{finalCartTotal}</span>
                  </div>
                </div>

                <div className="text-xs text-muted mb-3">Choose cash on delivery or pay securely online by UPI, card, or net banking.</div>
                <div className="flex flex-col gap-2">
                  <button className="btn btn-success w-full justify-center py-3 text-lg" onClick={() => placeOrder('cash')} disabled={placingOrder}>
                    {placingOrder ? '⏳ Processing...' : `Place Order · Cash (₹${finalCartTotal})`}
                  </button>
                  <button className="btn btn-primary w-full justify-center py-3 text-lg" onClick={() => placeOrder('online')} disabled={placingOrder}>
                    {placingOrder ? '⏳ Processing...' : `Pay Online (₹${finalCartTotal})`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
