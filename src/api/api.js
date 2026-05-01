const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:7849/api";

export const TOKEN_KEY = "purchase_sales_token";

const getToken = () => localStorage.getItem(TOKEN_KEY);

const request = async (path, options = {}) => {
  const {
    method = "GET",
    body,
    auth = true,
    headers = {}
  } = options;

  const finalHeaders = {
    ...headers
  };

  if (!(body instanceof FormData)) {
    finalHeaders["Content-Type"] = "application/json";
  }

  if (auth) {
    const token = getToken();
    if (token) {
      finalHeaders.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: finalHeaders,
    body: body
      ? body instanceof FormData
        ? body
        : JSON.stringify(body)
      : undefined
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong");
  }

  return data;
};

export const authApi = {
  bootstrap: (payload) =>
    request("/auth/bootstrap", {
      method: "POST",
      body: payload,
      auth: false
    }),

  login: (payload) =>
    request("/auth/login", {
      method: "POST",
      body: payload,
      auth: false
    }),

  me: () => request("/auth/me")
};

export const userApi = {
  list: () => request("/users"),
  create: (payload) =>
    request("/users", {
      method: "POST",
      body: payload
    }),
  update: (id, payload) =>
    request(`/users/${id}`, {
      method: "PUT",
      body: payload
    })
};

export const roleApi = {
  list: () => request("/roles"),
  create: (payload) =>
    request("/roles", {
      method: "POST",
      body: payload
    }),
  update: (id, payload) =>
    request(`/roles/${id}`, {
      method: "PUT",
      body: payload
    })
};

export const purchaseOrderApi = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/purchase-orders${query ? `?${query}` : ""}`);
  },

  get: (id) => request(`/purchase-orders/${id}`),

  create: (payload) =>
    request("/purchase-orders", {
      method: "POST",
      body: payload
    }),

  seedDummy: () =>
    request("/purchase-orders/seed-dummy", {
      method: "POST"
    }),

  accept: (id) =>
    request(`/purchase-orders/${id}/accept`, {
      method: "POST"
    }),

  reject: (id, reason) =>
    request(`/purchase-orders/${id}/reject`, {
      method: "POST",
      body: { reason }
    }),

  partialAccept: (id, items) =>
    request(`/purchase-orders/${id}/partial-accept`, {
      method: "POST",
      body: { items }
    }),

  moveToInventory: (id) =>
    request(`/purchase-orders/${id}/move-to-inventory`, {
      method: "POST"
    })
};

export const inventoryApi = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/inventory${query ? `?${query}` : ""}`);
  },

  get: (id) => request(`/inventory/${id}`),

  update: (id, payload) =>
    request(`/inventory/${id}`, {
      method: "PUT",
      body: payload
    })
};

export const saleApi = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/sales${query ? `?${query}` : ""}`);
  },

  get: (id) => request(`/sales/${id}`),

  create: (payload) =>
    request("/sales", {
      method: "POST",
      body: payload
    }),

  generateAcceptanceLink: (id) =>
    request(`/sales/${id}/send-acceptance-link`, {
      method: "POST"
    })
};

export const tallyApi = {
  logs: () => request("/tally/logs"),

  syncPurchaseDummy: (poId) =>
    request(`/tally/purchase/${poId}/sync-dummy`, {
      method: "POST"
    }),

  syncSaleDummy: (saleId) =>
    request(`/tally/sales/${saleId}/sync-dummy`, {
      method: "POST"
    })
};

export const clientAcceptanceApi = {
  get: (token) =>
    request(`/client-acceptance/${token}`, {
      auth: false
    }),

  accept: (token) =>
    request(`/client-acceptance/${token}/accept`, {
      method: "POST",
      auth: false
    }),

  reject: (token, payload) =>
    request(`/client-acceptance/${token}/reject`, {
      method: "POST",
      body: payload,
      auth: false
    })
};

export const reportApi = {
  purchase: () => request("/reports/purchase"),
  inventory: () => request("/reports/inventory"),
  sales: () => request("/reports/sales"),
  profitLoss: () => request("/reports/profit-loss"),
  userActivity: () => request("/reports/user-activity")
};