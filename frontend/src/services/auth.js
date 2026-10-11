import { apiRequest, setAuthToken, getAuthToken } from './api';

export const authService = {
  async login(identifier, password, expectedRole) {
    const data = await apiRequest('/auth/login/', {
      method: 'POST',
      body: {
        identifier,
        password,
        expected_role: expectedRole,
      },
    });

    if (data.token) {
      setAuthToken(data.token);
      localStorage.setItem('securebank_user', JSON.stringify(data.user));
    }

    return data;
  },

  async logout() {
    try {
      await apiRequest('/auth/logout/', { method: 'POST' });
    } catch {
      // Ignore network errors during logout
    } finally {
      setAuthToken(null);
      localStorage.removeItem('securebank_user');
    }
  },

  getCurrentUser() {
    try {
      const userStr = localStorage.getItem('securebank_user');
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  },

  setCurrentUser(user) {
    localStorage.setItem('securebank_user', JSON.stringify(user));
  },

  isAuthenticated() {
    return !!getAuthToken();
  },

  getRole() {
    const user = this.getCurrentUser();
    return user ? user.role : null;
  },

  async fetchMe() {
    const data = await apiRequest('/auth/me/');
    if (data.user) {
      this.setCurrentUser(data.user);
    }
    return data;
  },

  async registerCustomer(payload) {
    const data = await apiRequest('/customer/register/', {
      method: 'POST',
      body: payload,
    });
    if (data.token) {
      setAuthToken(data.token);
      this.setCurrentUser(data.user);
    }
    return data;
  },

  async openAccount(formDataOrPayload) {
    const data = await apiRequest('/customer/register/', {
      method: 'POST',
      body: formDataOrPayload,
    });
    if (data.token) {
      setAuthToken(data.token);
      if (data.user) this.setCurrentUser(data.user);
    }
    return data;
  },

  async customerLogin(identifier, password) {
    const data = await apiRequest('/auth/customer/login/', {
      method: 'POST',
      body: { identifier, password, expected_role: 'CUSTOMER' },
    });
    if (data.token) {
      setAuthToken(data.token);
      localStorage.setItem('securebank_user', JSON.stringify(data.user));
    }
    return data;
  },

  async setPassword(customerId, password, confirmPassword) {
    return apiRequest('/customer/set-password/', {
      method: 'POST',
      body: { customer_id: customerId, password, confirm_password: confirmPassword },
    });
  },

  async getBranches() {
    return apiRequest('/branches/').catch(() => apiRequest('/auth/branches/'));
  },

  async requestPasswordReset(email) {
    return apiRequest('/auth/password-reset/', {
      method: 'POST',
      body: { email },
    });
  },

  async confirmPasswordReset(token, newPassword) {
    return apiRequest('/auth/password-reset/confirm/', {
      method: 'POST',
      body: { token, new_password: newPassword },
    });
  },

  async changePassword(oldPassword, newPassword) {
    return apiRequest('/auth/change-password/', {
      method: 'POST',
      body: { old_password: oldPassword, new_password: newPassword },
    });
  }
};
