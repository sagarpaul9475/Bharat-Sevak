import { useEffect, useState, useRef } from 'react';
import { deliveryAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

// Calculate distance between two lat/lng coordinates in km (Haversine)
function getDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c).toFixed(2);
}

export default function LiveTrackingModal({ orderId, onClose, onOrderUpdated }) {
  const { user } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [otpInput, setOtpInput] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isBroadcastingGps, setIsBroadcastingGps] = useState(false);
  
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({ pickup: null, dropoff: null, driver: null, routeLine: null });
  const socketRef = useRef(null);
  const simIntervalRef = useRef(null);
  const gpsWatchIdRef = useRef(null);

  const isCustomer = user?.role === 'customer' || (order && String(order.customer?._id || order.customer) === String(user?._id));
  const isProvider = user?.role === 'provider' || (order && String(order.provider?._id || order.provider) === String(user?._id));
  const isDelivery = user?.role === 'delivery' || (order && order.assignedTo && String(order.assignedTo?._id || order.assignedTo) === String(user?._id));

  // 1. Fetch initial tracking details
  const fetchTracking = async () => {
    try {
      const res = await deliveryAPI.trackOrder(orderId);
      setOrder(res.data);
      return res.data;
    } catch (err) {
      toast.error('Failed to load tracking data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTracking();

    // 2. Connect socket for real-time order updates
    const socket = io(import.meta.env.VITE_API_URL?.replace(/\\/api\\/?$/, '') || window.location.origin, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_order', orderId);
    });

    socket.on('order:location_update', (data) => {
      if (data?.liveLocation) {
        setOrder(prev => prev ? { ...prev, liveLocation: data.liveLocation } : prev);
        updateDriverMarker(data.liveLocation);
      }
    });

    socket.on('order:status_update', (data) => {
      setOrder(prev => prev ? { ...prev, status: data.status, fulfillmentStatus: data.fulfillmentStatus } : prev);
      if (onOrderUpdated) onOrderUpdated();
    });

    socket.on('order:completed', () => {
      toast.success('🎉 Delivery & Service Completed! OTP Verified.');
      fetchTracking();
      if (onOrderUpdated) onOrderUpdated();
    });

    socket.on('order:updated', (updated) => {
      setOrder(updated);
      if (onOrderUpdated) onOrderUpdated();
    });

    // Fallback polling every 5s
    const pollInterval = setInterval(fetchTracking, 5000);

    return () => {
      clearInterval(pollInterval);
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
      if (gpsWatchIdRef.current) navigator.geolocation?.clearWatch(gpsWatchIdRef.current);
      if (socket) {
        socket.emit('leave_order', orderId);
        socket.disconnect();
      }
    };
  }, [orderId]);

  // 3. Initialize Leaflet Map
  useEffect(() => {
    if (!order || !mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // already initialized

    const L = window.L;
    if (!L) return;

    const pickup = order.pickupLocation && Number.isFinite(Number(order.pickupLocation.lat)) && Number.isFinite(Number(order.pickupLocation.lng)) ? order.pickupLocation : null;
    const dropoff = order.dropoffLocation && Number.isFinite(Number(order.dropoffLocation.lat)) && Number.isFinite(Number(order.dropoffLocation.lng)) ? order.dropoffLocation : null;
    const driverLoc = order.liveLocation && Number.isFinite(Number(order.liveLocation.lat)) && Number.isFinite(Number(order.liveLocation.lng)) ? order.liveLocation : pickup || dropoff;
    if (!pickup && !dropoff && !driverLoc) return;

    const map = L.map(mapContainerRef.current, {
      center: [driverLoc.lat, driverLoc.lng],
      zoom: 14,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Custom Icon HTML helper
    const createCustomIcon = (emoji, label, color) => {
      return L.divIcon({
        className: 'custom-map-marker',
        html: `
          <div style="display:flex; flex-direction:column; align-items:center; transform: translate(-50%, -100%);">
            <div style="background:${color}; color:#fff; font-size:18px; width:38px; height:38px; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 14px rgba(0,0,0,0.4); border:2px solid #fff;">
              ${emoji}
            </div>
            <div style="background:rgba(15,23,42,0.9); color:#fff; font-size:11px; font-weight:700; padding:2px 8px; border-radius:10px; margin-top:4px; white-space:nowrap; border:1px solid #334155;">
              ${label}
            </div>
          </div>
        `,
        iconSize: [40, 50],
        iconAnchor: [20, 50],
      });
    };

    // Add Shop/Provider Marker
    const pickupMarker = pickup ? L.marker([pickup.lat, pickup.lng], { icon: createCustomIcon('🏪', order.provider?.businessName || 'Shop / Pickup', '#F59E0B') }).addTo(map).bindPopup(`<strong>${order.provider?.businessName || 'Provider'}</strong><br/>Pickup / Source Point`) : null;

    // Add Customer Marker
    const dropoffMarker = dropoff ? L.marker([dropoff.lat, dropoff.lng], { icon: createCustomIcon('🏠', 'Customer Destination', '#10B981') }).addTo(map).bindPopup(`<strong>Delivery Destination</strong><br/>${order.deliveryAddress || 'Customer Address'}`) : null;

    // Add Driver / Live Location Marker
    const isService = order.orderType === 'service';
    const driverIcon = isService ? '🔧' : '🛵';
    const driverLabel = order.assignedName ? `${driverIcon} ${order.assignedName}` : 'Partner En Route';
    const driverMarker = order.liveLocation?.isLive && driverLoc ? L.marker([driverLoc.lat, driverLoc.lng], { icon: createCustomIcon(driverIcon, driverLabel, '#3B82F6') }).addTo(map).bindPopup(`<strong>Live Partner Location</strong><br/>Status: ${order.status.replace('_', ' ')}`) : null;

    // Draw route polyline
    const routePoints = [pickup, order.liveLocation?.isLive ? driverLoc : null, dropoff].filter(Boolean).map(point => [point.lat, point.lng]);
    const routeLine = routePoints.length > 1 ? L.polyline(routePoints, { color: '#3B82F6', weight: 4, dashArray: '8, 8', opacity: 0.8 }).addTo(map) : null;

    // Fit bounds to show all markers
    const visibleMarkers = [pickupMarker, dropoffMarker, driverMarker].filter(Boolean);
    if (visibleMarkers.length > 1) map.fitBounds(L.featureGroup(visibleMarkers).getBounds().pad(0.2));
    else map.setView([driverLoc.lat, driverLoc.lng], 15);

    markersRef.current = { pickup: pickupMarker, dropoff: dropoffMarker, driver: driverMarker, routeLine };
    mapInstanceRef.current = map;
  }, [order]);

  // Update Driver Marker on live position changes
  const updateDriverMarker = (newLoc) => {
    if (!newLoc || !mapInstanceRef.current) return;
    const L = window.L;
    if (!L) return;
    if (markersRef.current.driver) markersRef.current.driver.setLatLng([newLoc.lat, newLoc.lng]);
    else if (order?.assignedTo || order?.assignedName) {
      markersRef.current.driver = L.marker([newLoc.lat, newLoc.lng]).addTo(mapInstanceRef.current).bindPopup('Live delivery partner location');
    } else return;

    if (order && markersRef.current.routeLine) {
      const points = [order.pickupLocation, newLoc, order.dropoffLocation].filter(point => point && Number.isFinite(Number(point.lat)) && Number.isFinite(Number(point.lng))).map(point => [point.lat, point.lng]);
      markersRef.current.routeLine.setLatLngs(points);
    }
  };

  // 4. Verify Customer OTP (Delivery & Service Completion)
  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    if (!otpInput || otpInput.trim().length !== 4) {
      toast.error('Please enter the valid 4-digit OTP provided by customer');
      return;
    }

    setVerifyingOtp(true);
    try {
      const res = await deliveryAPI.verifyOtp(orderId, { otp: otpInput.trim() });
      toast.success(res.data.message || 'OTP Verified! Delivery Completed.');
      setOrder(res.data.order);
      if (onOrderUpdated) onOrderUpdated();
    } catch (err) {
      toast.error(err.response?.data?.message || 'OTP verification failed');
    } finally {
      setVerifyingOtp(false);
    }
  };

  // 5. Status Transition Shortcut (En Route, Arrived)
  const handleUpdateFulfillmentStatus = async (statusKey) => {
    try {
      const res = await deliveryAPI.updateStatus(orderId, { status: statusKey });
      toast.success(`Status updated to ${statusKey.replace('_', ' ')}`);
      setOrder(res.data);
      if (onOrderUpdated) onOrderUpdated();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  // 6. Test Simulator: Smoothly animates driver from pickup to dropoff
  const toggleSimulator = () => {
    if (isSimulating) {
      clearInterval(simIntervalRef.current);
      setIsSimulating(false);
      toast('Driver simulator stopped');
      return;
    }

    if (!order) return;
    const startLat = order.liveLocation?.lat ?? order.pickupLocation?.lat;
    const startLng = order.liveLocation?.lng ?? order.pickupLocation?.lng;
    const targetLat = order.dropoffLocation?.lat;
    const targetLng = order.dropoffLocation?.lng;
    if (![startLat, startLng, targetLat, targetLng].every(value => Number.isFinite(Number(value)))) { toast.error('Real pickup and destination coordinates are required; use the address map instead.'); return; }

    let step = 0;
    const totalSteps = 25;
    setIsSimulating(true);
    toast.success('🚗 Driver Simulator started! Watch the pin move on the map.');

    simIntervalRef.current = setInterval(async () => {
      step++;
      const progress = step / totalSteps;
      const currentLat = startLat + (targetLat - startLat) * progress;
      const currentLng = startLng + (targetLng - startLng) * progress;

      updateDriverMarker({ lat: currentLat, lng: currentLng });

      try {
        await deliveryAPI.updateLocation(orderId, {
          lat: currentLat,
          lng: currentLng,
          heading: 45,
          speed: 28,
        });
      } catch (err) {
        // silent
      }

      if (step >= totalSteps) {
        clearInterval(simIntervalRef.current);
        setIsSimulating(false);
        toast.success('📍 Driver arrived at destination! Now enter customer OTP to confirm.');
        handleUpdateFulfillmentStatus('in_progress');
      }
    }, 2000);
  };

  // 7. Real Device GPS Broadcast
  const toggleGpsBroadcast = () => {
    if (isBroadcastingGps) {
      if (gpsWatchIdRef.current) navigator.geolocation.clearWatch(gpsWatchIdRef.current);
      setIsBroadcastingGps(false);
      toast('Real GPS broadcast stopped');
      return;
    }

    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setIsBroadcastingGps(true);
    toast.success('📡 Broadcasting your live GPS location to customer and shop owner!');

    gpsWatchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude, heading, speed } = pos.coords;
        updateDriverMarker({ lat: latitude, lng: longitude });
        try {
          await deliveryAPI.updateLocation(orderId, {
            lat: latitude,
            lng: longitude,
            heading: heading || 0,
            speed: speed ? (speed * 3.6).toFixed(1) : 0,
          });
        } catch (err) {
          // silent
        }
      },
      (err) => {
        toast.error('GPS error: ' + err.message);
        setIsBroadcastingGps(false);
      },
      { enableHighAccuracy: true, maximumAge: 1000 }
    );
  };

  // Remaining distance calculation
  const remainingKm = order?.liveLocation && order?.dropoffLocation
    ? getDistanceKm(order.liveLocation.lat, order.liveLocation.lng, order.dropoffLocation.lat, order.dropoffLocation.lng)
    : null;

  return (
    <div className="modal-overlay" style={{ zIndex: 10000 }} onClick={(e) => e.target.classList.contains('modal-overlay') && onClose()}>
      <div className="modal-box" style={{ maxWidth: 840, width: '95%', maxHeight: '92vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
        
        {/* Modal Header */}
        <div style={{ background: '#0F172A', padding: '14px 16px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 20 }}>{order?.orderType === 'service' ? '🔧' : '🛵'}</span>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#F8FAFC' }} className="truncate">
                Live Tracking — #{order?.orderId || orderId}
              </h2>
              <span className={`badge badge-${order?.status === 'completed' ? 'completed' : order?.status === 'out_for_delivery' || order?.status === 'in_progress' ? 'confirmed' : 'pending'}`} style={{ fontSize: 10 }}>
                {order?.status?.replace('_', ' ')?.toUpperCase() || 'LOADING...'}
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              {order?.orderType === 'service' ? 'On-Demand Service Fulfillment' : 'Order Delivery Tracking'}
            </div>
          </div>
          <button className="btn-icon btn-secondary" onClick={onClose} style={{ fontSize: 16, flexShrink: 0 }}>✕</button>
        </div>

        {/* Modal Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
          
          {loading ? (
            <div className="loading-center" style={{ minHeight: 300 }}><div className="spinner" /></div>
          ) : !order ? (
            <div className="empty-state"><div className="empty-title">Order not found</div></div>
          ) : (
            <>
              {/* KEY HIGHLIGHT: Customer OTP Box */}
              {isCustomer && (
                <div style={{
                  background: order.otpVerified
                    ? 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05))'
                    : 'linear-gradient(135deg, rgba(245,158,11,0.18), rgba(217,119,6,0.08))',
                  border: `2px solid ${order.otpVerified ? '#10B981' : '#F59E0B'}`,
                  borderRadius: 12,
                  padding: '16px 20px',
                  marginBottom: 18,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ fontSize: 32 }}>
                      {order.otpVerified ? '✅' : '🔐'}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: order.otpVerified ? '#10B981' : '#F59E0B' }}>
                        {order.otpVerified ? 'Service / Delivery Verified' : 'Your Secret Completion OTP'}
                      </div>
                      <div style={{ fontSize: 13, color: '#CBD5E1', marginTop: 2 }}>
                        {order.otpVerified
                          ? `Confirmed on ${new Date(order.otpVerifiedAt || order.updatedAt).toLocaleTimeString()}`
                          : 'Share this code with your delivery agent or technician ONLY after receiving goods or work is done.'}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    {order.otpVerified ? (
                      <div style={{ background: '#10B981', color: '#fff', padding: '6px 14px', borderRadius: 8, fontWeight: 800, fontSize: 14 }}>
                        CONFIRMED
                      </div>
                    ) : (
                      <div style={{
                        background: '#0F172A',
                        border: '2px dashed #F59E0B',
                        padding: '6px 16px',
                        borderRadius: 10,
                        fontSize: 26,
                        fontWeight: 900,
                        letterSpacing: 4,
                        color: '#F59E0B',
                        fontFamily: 'monospace'
                      }}>
                        {order.deliveryOtp || '----'}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Status Pipeline Tracker */}
              <div style={{ background: '#1E293B', borderRadius: 12, padding: '14px 18px', marginBottom: 18, border: '1px solid #334155' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
                  
                  {[
                    { key: 'confirmed', label: 'Accepted', icon: '📝' },
                    { key: 'assigned', label: 'Assigned', icon: '👤' },
                    { key: 'out_for_delivery', label: order.orderType === 'service' ? 'En Route' : 'Out for Delivery', icon: order.orderType === 'service' ? '🔧' : '🛵' },
                    { key: 'in_progress', label: order.orderType === 'service' ? 'Work in Progress' : 'Arrived', icon: '📍' },
                    { key: 'completed', label: 'Delivered via OTP', icon: '🏁' },
                  ].map((step, idx) => {
                    const statusOrder = ['pending', 'confirmed', 'assigned', 'out_for_delivery', 'in_progress', 'completed'];
                    const currentIdx = statusOrder.indexOf(order.status);
                    const stepIdx = statusOrder.indexOf(step.key);
                    const isDone = currentIdx >= stepIdx;
                    const isCurrent = currentIdx === stepIdx;

                    return (
                      <div key={step.key} style={{ textAlign: 'center', zIndex: 2, flex: 1 }}>
                        <div style={{
                          width: 36,
                          height: 36,
                          margin: '0 auto 6px',
                          borderRadius: '50%',
                          background: isDone ? '#10B981' : isCurrent ? '#F59E0B' : '#334155',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 16,
                          boxShadow: isCurrent ? '0 0 14px rgba(245,158,11,0.5)' : 'none',
                          border: isCurrent ? '2px solid #F8FAFC' : 'none'
                        }}>
                          {step.icon}
                        </div>
                        <div style={{ fontSize: 11, fontWeight: isCurrent ? 700 : 500, color: isDone || isCurrent ? '#F8FAFC' : 'var(--text-muted)' }}>
                          {step.label}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Interactive Leaflet Map Container */}
              <div className="tracking-map-wrapper" style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid #334155', marginBottom: 18 }}>
                <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

                {/* Live Distance & ETA Pill */}
                {remainingKm && order.status !== 'completed' && (
                  <div style={{
                    position: 'absolute',
                    top: 12,
                    left: 12,
                    zIndex: 1000,
                    background: 'rgba(15,23,42,0.85)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid #334155',
                    borderRadius: 20,
                    padding: '6px 14px',
                    fontSize: 12,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    color: '#F8FAFC'
                  }}>
                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px #10B981' }} />
                    <span>~{remainingKm} km away</span>
                    <span style={{ color: 'var(--text-muted)' }}>•</span>
                    <span style={{ color: '#F59E0B' }}>ETA ~{Math.ceil(remainingKm * 3.5)} mins</span>
                  </div>
                )}
              </div>

              {/* Partner & Location Cards */}
              <div className="grid-2" style={{ gap: 14, marginBottom: 18 }}>
                
                {/* Delivery Agent / Technician Card */}
                <div style={{ background: '#1E293B', padding: 14, borderRadius: 10, border: '1px solid #334155' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                    {order.orderType === 'service' ? 'Field Technician' : 'Delivery Partner'}
                  </div>
                  {order.assignedName || order.assignedTo ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div className="avatar" style={{ width: 42, height: 42, fontSize: 16 }}>
                        {(order.assignedName?.[0] || 'D').toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{order.assignedName || order.assignedTo?.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {order.assignedRole?.replace('_', ' ')?.toUpperCase()} • {order.assignedTo?.deliveryVehicleType || 'Vehicle'}
                        </div>
                        {order.assignedPhone && (
                          <a href={`tel:${order.assignedPhone}`} style={{ fontSize: 12, color: '#38BDF8', textDecoration: 'none', display: 'inline-block', marginTop: 2 }}>
                            📞 {order.assignedPhone}
                          </a>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: '#F59E0B', fontSize: 13, fontStyle: 'italic' }}>
                      ⏳ Partner is being assigned by the provider...
                    </div>
                  )}
                </div>

                {/* Addresses Card */}
                <div style={{ background: '#1E293B', padding: 14, borderRadius: 10, border: '1px solid #334155' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                    Route Details
                  </div>
                  <div style={{ fontSize: 12, marginBottom: 6 }}>
                    <span style={{ color: '#F59E0B', fontWeight: 700 }}>Pickup: </span>
                    {order.provider?.businessName || order.pickupLocation?.address || 'Provider Facility'}
                  </div>
                  <div style={{ fontSize: 12 }}>
                    <span style={{ color: '#10B981', fontWeight: 700 }}>Drop: </span>
                    {order.deliveryAddress || order.dropoffLocation?.address || 'Customer Location'}
                  </div>
                </div>
              </div>

              {/* ACTION PANELS: For Delivery Agents & Providers */}
              {(!isCustomer || user?.role === 'admin') && order.status !== 'completed' && (
                <div style={{ background: '#1E293B', padding: 16, borderRadius: 12, border: '1px solid #334155', marginBottom: 12 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>⚡</span> Delivery & Service Action Console
                  </h3>

                  {/* Status buttons */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                    {order.status === 'assigned' && (
                      <button className="btn btn-primary btn-sm" onClick={() => handleUpdateFulfillmentStatus('out_for_delivery')}>
                        🚀 Start Journey (En Route)
                      </button>
                    )}
                    {order.status === 'out_for_delivery' && (
                      <button className="btn btn-secondary btn-sm" onClick={() => handleUpdateFulfillmentStatus('in_progress')}>
                        📍 Mark Arrived at Destination
                      </button>
                    )}
                    
                    {/* Live GPS Broadcast */}
                    <button
                      className={`btn btn-sm ${isBroadcastingGps ? 'btn-danger' : 'btn-secondary'}`}
                      onClick={toggleGpsBroadcast}
                    >
                      {isBroadcastingGps ? '⏹️ Stop Real GPS' : '📡 Broadcast Real Device GPS'}
                    </button>

                    {/* Test Simulator */}
                    <button
                      className={`btn btn-sm ${isSimulating ? 'btn-danger' : 'btn-secondary'}`}
                      onClick={toggleSimulator}
                    >
                      {isSimulating ? '⏹️ Stop Simulator' : '🚗 Test Movement Simulator'}
                    </button>
                  </div>

                  {/* OTP Verification Form */}
                  <form onSubmit={handleVerifyOtp} style={{ background: '#0F172A', padding: 14, borderRadius: 10, border: '1px solid #334155' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <label style={{ fontSize: 13, fontWeight: 700, color: '#F59E0B' }}>
                        🔑 Enter Customer's 4-Digit Completion OTP:
                      </label>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Ask customer for code upon handover</span>
                    </div>

                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <input
                        type="text"
                        maxLength={4}
                        placeholder="e.g. 4829"
                        value={otpInput}
                        onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                        style={{
                          background: '#1E293B',
                          border: '2px solid #334155',
                          borderRadius: 8,
                          padding: '10px 14px',
                          color: '#fff',
                          fontSize: 20,
                          fontWeight: 800,
                          letterSpacing: 4,
                          textAlign: 'center',
                          flex: '1 1 120px',
                          minWidth: 120,
                        }}
                      />
                      <button
                        type="submit"
                        className="btn btn-success"
                        style={{ flex: '2 1 180px', padding: '10px 16px', fontWeight: 700, justifyContent: 'center' }}
                        disabled={verifyingOtp || otpInput.length !== 4}
                      >
                        {verifyingOtp ? '⏳ Verifying...' : '✅ Verify OTP & Confirm'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Completed Notice */}
              {order.status === 'completed' && (
                <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid #10B981', borderRadius: 10, padding: 14, textAlign: 'center', color: '#10B981', fontWeight: 700 }}>
                  🎉 This order was successfully completed & verified via Customer OTP! All parties confirmed.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
