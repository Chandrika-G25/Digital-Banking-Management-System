import { apiRequest } from './api';

export const verificationService = {
  // Customer endpoints
  async getStatus() {
    return apiRequest('/customer/verification-status/');
  },

  async uploadDocument(formData) {
    return apiRequest('/customer/documents/', {
      method: 'POST',
      body: formData,
    });
  },

  async submitAdditionalInfo(formDataOrJson) {
    return apiRequest('/customer/additional-information/', {
      method: 'POST',
      body: formDataOrJson,
    });
  },

  // Employee endpoints
  async getEmployeeApplications(params = {}) {
    const query = new URLSearchParams();
    if (params.status && params.status !== 'ALL') {
      query.append('status', params.status);
    }
    if (params.search) {
      query.append('search', params.search);
    }
    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiRequest(`/employee/customer-verification/${qs}`);
  },

  async getApplicationDetail(applicationId) {
    return apiRequest(`/employee/customer-verification/${applicationId}/`);
  },

  async approveApplication(applicationId, notes = '') {
    return apiRequest(`/employee/customer-verification/${applicationId}/approve/`, {
      method: 'POST',
      body: { notes },
    });
  },

  async rejectApplication(applicationId, reason, notes = '') {
    return apiRequest(`/employee/customer-verification/${applicationId}/reject/`, {
      method: 'POST',
      body: { reason, notes },
    });
  },

  async requestInformation(applicationId, missingInformation, notes = '') {
    return apiRequest(`/employee/customer-verification/${applicationId}/request-information/`, {
      method: 'POST',
      body: { missing_information: missingInformation, notes },
    });
  },
};
