export const apiRoutes = {
  // Authentication
  login: '/api/auth/login',
  register: '/api/auth/register',
  logout: '/api/auth/logout',
  
  // User
  user: '/api/user',
  
  // Subscriptions
  subscriptions: '/api/subscriptions',
  subscription: (id) => `/api/subscriptions/${id}`,
  
  // Bots
  bots: '/api/bots',
  bot: (id) => `/api/bots/${id}`,
  botQr: (id) => `/api/bots/${id}/qr`,
  botForceConnect: (id) => `/api/bots/${id}/force-connect`,
  
  // Webhooks
  webhooks: '/api/webhooks',
  
  // Dashboard
  dashboard: '/api/dashboard'
};

export const pageRoutes = {
  // Auth
  login: '/auth/login',
  register: '/auth/register',
  
  // Dashboard
  dashboard: '/dashboard/client',
  
  // Bots
  bots: '/dashboard/client/bots',
  botDetail: (id) => `/dashboard/client/bots/${id}`,
  botConnect: (id) => `/dashboard/client/bots/${id}/connect`,
  
  // Subscriptions
  subscriptions: '/dashboard/client/subscriptions',
  
  // Settings
  settings: '/dashboard/client/settings',
  
  // Admin
  admin: '/dashboard/admin'
}; 