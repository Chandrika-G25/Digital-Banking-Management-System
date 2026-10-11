import { apiRequest } from './api';

export const depositService = {
  /**
   * Search eligible customers by Customer ID, Account Number, or Mobile Number
   */
  async searchCustomers(query) {
    if (!query || query.trim().length < 2) return [];
    return await apiRequest(`/employee/deposits/customer-search/?query=${encodeURIComponent(query.trim())}`);
  },

  /**
   * Initiate and process an authorized counter cash deposit
   */
  async processDeposit(payload, idempotencyKey = null) {
    return await apiRequest('/employee/deposits/', {
      method: 'POST',
      body: payload,
      idempotencyKey: idempotencyKey || payload.idempotency_key
    });
  },

  /**
   * Retrieve permitted cash deposit history for employee
   */
  async getDepositHistory(params = {}) {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.status) query.append('status', params.status);
    if (params.from_date) query.append('from_date', params.from_date);
    if (params.to_date) query.append('to_date', params.to_date);
    if (params.teller) query.append('teller', params.teller);
    if (params.page) query.append('page', params.page);

    const queryString = query.toString();
    const endpoint = queryString ? `/employee/deposits/?${queryString}` : '/employee/deposits/';
    return await apiRequest(endpoint);
  },

  /**
   * Retrieve specific deposit receipt data
   */
  async getDepositDetail(reference) {
    return await apiRequest(`/employee/deposits/${encodeURIComponent(reference)}/`);
  },

  /**
   * Retrieve branch deposit summaries and monitoring data for manager
   */
  async getManagerSummary() {
    return await apiRequest('/manager/deposits/summary/');
  },

  /**
   * Reverse an authorized counter cash deposit with reason
   */
  async reverseDeposit(reference, reason) {
    return await apiRequest(`/manager/deposits/${encodeURIComponent(reference)}/reverse/`, {
      method: 'POST',
      body: { reason }
    });
  }
};
