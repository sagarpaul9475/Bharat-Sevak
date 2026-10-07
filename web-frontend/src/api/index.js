import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://bharat-sevak.onrender.com/api',
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('bs_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('bs_token');
      localStorage.removeItem('bs_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const authAPI = {
  register: (data) => API.post('/auth/register', data),
  login: (data) => API.post('/auth/login', data),
  me: () => API.get('/auth/me'),
  switchRole: () => API.put('/auth/switch-role'),
};

// Customer / Public
export const customerAPI = {
  getProducts: (params) => API.get('/customer/products', { params }),
  getServices: (params) => API.get('/customer/services', { params }),
  getMenus: () => API.get('/customer/menus'),
  placeOrder: (data) => API.post('/customer/orders', data),
  getOrders: (params) => API.get('/customer/orders', { params }),
  getOrder: (id) => API.get(`/customer/orders/${id}`),
  cancelOrder: (id) => API.post(`/customer/orders/${id}/cancel`),
  updateProfile: (data) => API.put('/customer/profile', data),
};

// Provider
export const providerAPI = {
  getDashboard: () => API.get('/provider/dashboard'),
  // Products
  getProducts: () => API.get('/provider/products'),
  addProduct: (data) => API.post('/provider/products', data),
  updateProduct: (id, data) => API.put(`/provider/products/${id}`, data),
  deleteProduct: (id) => API.delete(`/provider/products/${id}`),
  // Services
  getServices: () => API.get('/provider/services'),
  addService: (data) => API.post('/provider/services', data),
  updateService: (id, data) => API.put(`/provider/services/${id}`, data),
  deleteService: (id) => API.delete(`/provider/services/${id}`),
  // Orders
  getOrders: (params) => API.get('/provider/orders', { params }),
  updateOrderStatus: (id, data) => API.put(`/provider/orders/${id}/status`, data),
  // Co-providers
  getCoProviders: () => API.get('/provider/co-providers'),
  updateProfile: (data) => API.put('/provider/profile', data),
  // Provider support queries
  getQueries: () => API.get('/provider/queries/mine'),
  createQuery: (data) => API.post('/provider/queries', data),
};

// Admin
export const adminAPI = {
  getDashboard: () => API.get('/admin/dashboard'),
  // Users
  getUsers: (params) => API.get('/admin/users', { params }),
  updateUser: (id, data) => API.put(`/admin/users/${id}`, data),
  deleteUser: (id) => API.delete(`/admin/users/${id}`),
  // Approvals
  getPendingProviders: () => API.get('/admin/approvals/providers'),
  approveProvider: (id) => API.put(`/admin/approvals/providers/${id}/approve`),
  rejectProvider: (id) => API.put(`/admin/approvals/providers/${id}/reject`),
  getPendingProducts: () => API.get('/admin/approvals/products'),
  approveProduct: (id) => API.put(`/admin/approvals/products/${id}/approve`),
  rejectProduct: (id, reason) => API.put(`/admin/approvals/products/${id}/reject`, { reason }),
  getPendingServices: () => API.get('/admin/approvals/services'),
  approveService: (id) => API.put(`/admin/approvals/services/${id}/approve`),
  rejectService: (id, reason) => API.put(`/admin/approvals/services/${id}/reject`, { reason }),
  // Orders
  getAllOrders: (params) => API.get('/admin/orders', { params }),
  // Menu
  getMenus: () => API.get('/admin/menu'),
  addMenu: (data) => API.post('/admin/menu', data),
  updateMenu: (id, data) => API.put(`/admin/menu/${id}`, data),
  deleteMenu: (id) => API.delete(`/admin/menu/${id}`),
  // Regions
  getRegions: () => API.get('/admin/regions'),
  addRegion: (data) => API.post('/admin/regions', data),
  updateRegion: (id, data) => API.put(`/admin/regions/${id}`, data),
  deleteRegion: (id) => API.delete(`/admin/regions/${id}`),
  // Reports
  getSalesReport: () => API.get('/admin/reports/sales'),
  getProviderReport: () => API.get('/admin/reports/providers'),
  // Admin messaging
  getMessageRecipients: (params) => API.get('/admin/message-recipients', { params }),
  sendMessage: (data) => API.post('/admin/messages', data),
  getMessageHistory: (params) => API.get('/admin/messages', { params }),
  // Provider queries
  getProviderQueries: (params) => API.get('/provider/queries/admin', { params }),
  updateProviderQuery: (id, data) => API.put('/provider/queries/admin/' + id, data),
};

// In-app notifications
export const notificationsAPI = {
  list: (params) => API.get('/notifications', { params }),
  markRead: (id) => API.patch(`/notifications/${id}/read`),
  markAllRead: () => API.patch('/notifications/read-all'),
};

// Online payments (Razorpay)
export const paymentAPI = {
  createOrder: (orderId) => API.post(`/payments/orders/${orderId}/create`),
  verifyOrder: (orderId, data) => API.post(`/payments/orders/${orderId}/verify`, data),
};

// Complaints / Grievance
export const complaintsAPI = {
  file: (data) => API.post('/complaints', data),
  mine: () => API.get('/complaints/mine'),
  all: (params) => API.get('/complaints', { params }),
  update: (id, data) => API.put(`/complaints/${id}`, data),
};

// Uploads
export const uploadAPI = {
  uploadProductMedia: (formData) => API.post('/upload/product-media', formData),
  uploadKyc: (formData) => API.post('/upload/kyc', formData),
  uploadBusiness: (formData) => API.post('/upload/business', formData),
  downloadDocument: (userId, category, filename) => API.get(`/upload/document/${userId}/${category}/${encodeURIComponent(filename)}`, { responseType: 'blob' }),
  deleteKyc: (filename) => API.delete(`/upload/kyc/${filename}`),
  deleteBusiness: (filename) => API.delete(`/upload/business/${filename}`),
  myDocs: () => API.get('/upload/my-docs'),
};

export default API;
