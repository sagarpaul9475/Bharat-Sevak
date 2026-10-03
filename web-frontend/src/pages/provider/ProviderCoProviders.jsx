import { useEffect, useState } from 'react';
import { providerAPI, customerAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function ProviderCoProviders() {
  const { user } = useAuth();
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  // Booking state
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [providerServices, setProviderServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    providerAPI.getCoProviders().then(r => setProviders(r.data)).catch(() => toast.error('Failed to load co-providers')).finally(() => setLoading(false));
  }, []);

  const handleSelectProvider = async (p) => {
    setSelectedProvider(p);
    setServicesLoading(true);
    try {
      const res = await customerAPI.getServices({ provider: p._id });
      setProviderServices(res.data.services);
    } catch {
      toast.error('Failed to load services for this provider');
    } finally {
      setServicesLoading(false);
    }
  };

  const handleBookService = async (service) => {
    setBookingLoading(true);
    try {
      await customerAPI.placeOrder({
        items: [{
          itemType: 'service',
          item: service._id,
          itemName: service.name,
          itemPrice: service.rate,
          quantity: 1,
          providerId: selectedProvider._id,
          providerName: selectedProvider.businessName || selectedProvider.name
        }],
        paymentMethod: 'cash',
        deliveryAddress: user?.address || 'My Business Address',
        notes: 'B2B Co-Provider Booking'
      });
      toast.success(`Successfully booked ${service.name} from ${selectedProvider.businessName || selectedProvider.name}!`);
      setSelectedProvider(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to book service');
    } finally {
      setBookingLoading(false);
    }
  };

  const filtered = providers.filter(p => p.name.toLowerCase().includes(filter.toLowerCase()) || p.businessName?.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="animate-fade relative">
      <div className="page-header">
        <div>
          <h1 className="page-title">🤝 Co-Providers</h1>
          <p className="page-subtitle">Discover, network, and book services from other businesses on Bharat Sevak</p>
        </div>
      </div>

      <div className="card mb-4" style={{ padding: 12 }}>
        <input className="form-input" placeholder="🔍 Search providers by name..." value={filter} onChange={e => setFilter(e.target.value)} />
      </div>

      {loading ? <div className="loading-center"><div className="spinner" /></div> : (
        filtered.length === 0 ? <div className="empty-state"><div className="empty-icon">🤝</div><div className="empty-title">No providers found</div></div> :
        <div className="grid-3">
          {filtered.map(p => (
            <div key={p._id} className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div className="avatar" style={{ width: 80, height: 80, fontSize: 32, marginBottom: 16 }}>{p.businessName?.[0]?.toUpperCase() || p.name[0].toUpperCase()}</div>
              <h3 className="font-bold text-lg">{p.businessName || p.name}</h3>
              <div className="text-sm text-muted mb-2">{p.name} • {p.providerType}</div>
              <p className="text-sm mb-4 line-clamp-2" style={{ minHeight: 40 }}>{p.businessDesc || 'No business description provided.'}</p>
              <div className="mt-auto w-full">
                <div className="text-xs text-muted mb-3 p-2 bg-navy rounded">
                  📍 {[p.region?.area, p.region?.district, p.region?.state].filter(Boolean).join(', ') || 'No region set'}
                </div>
                <button className="btn btn-secondary w-full justify-center" onClick={() => handleSelectProvider(p)}>View & Book Services</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal for Booking */}
      {selectedProvider && (
        <div className="modal-overlay" onClick={(e) => e.target.classList.contains('modal-overlay') && setSelectedProvider(null)}>
          <div className="modal-box wide">
            <div className="modal-head">
              <h2>{selectedProvider.businessName || selectedProvider.name} - Services</h2>
              <button className="btn-icon btn-secondary" onClick={() => setSelectedProvider(null)}>✕</button>
            </div>
            
            <div className="mb-4 text-sm text-muted">
              <p>{selectedProvider.businessDesc}</p>
              <p className="mt-2">📞 {selectedProvider.phone}</p>
            </div>

            <h3 className="font-bold mb-3">Available Services to Book</h3>
            
            {servicesLoading ? <div className="loading-center"><div className="spinner" /></div> : (
              providerServices.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">🛠️</div>
                  <div className="empty-title">No services found</div>
                  <div className="text-sm text-muted">This provider hasn't listed any active services yet.</div>
                </div>
              ) : (
                <div className="grid-2">
                  {providerServices.map(service => (
                    <div key={service._id} className="card bg-navy border-navy-border p-4">
                      <h4 className="font-bold text-md mb-1">{service.name}</h4>
                      <p className="text-xs text-muted mb-3 line-clamp-2" style={{ minHeight: 32 }}>{service.description || 'No description'}</p>
                      <div className="flex justify-between items-center mt-auto pt-3" style={{ borderTop: '1px solid var(--navy-border)' }}>
                        <div className="font-bold text-saffron">₹{service.rate} <span className="text-xs font-normal text-muted">/ {service.rateUnit}</span></div>
                        <button className="btn btn-primary btn-sm" onClick={() => handleBookService(service)} disabled={bookingLoading}>
                          {bookingLoading ? '⏳...' : 'Book Service'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
