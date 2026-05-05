const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function getAuthHeader() {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }
  return {};
}

async function apiFetch(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = 'An error occurred while communicating with the server';
    try {
      const errorData = await response.json();
      errorDetail = errorData.detail || errorDetail;
    } catch (e) {
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

export const api = {
  auth: {
    login: async (username, password) => {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);
      
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });
      
      if (!response.ok) {
        let errorDetail = 'Login failed';
        try {
          const errorData = await response.json();
          errorDetail = errorData.detail || errorDetail;
        } catch (e) {}
        throw new Error(errorDetail);
      }
      return response.json();
    }
  },
  patient: {
    getMyPlan: () => apiFetch('/patient/my-plan'),
    getMyPhysio: () => apiFetch('/patient/my-physio'),
    submitSession: (rehabId, resultsList) => apiFetch(`/patient/submit-session?rehab_id=${rehabId}`, { 
      method: 'POST', 
      body: JSON.stringify(resultsList) 
    }),
  },
  users: {
    register: (userData) => apiFetch('/users/register', { method: 'POST', body: JSON.stringify(userData) }),
    getMe: () => apiFetch('/users/me'),
    requestPhysio: (physioId) => apiFetch(`/users/request-physio/${physioId}`, { method: 'POST' }),
    getAllPhysiotherapists: () => apiFetch('/users/physiotherapists'),
  },
  physio: {
    getMyPatients: () => apiFetch('/physio/my-patients'),
    addExercise: (exerciseData) => apiFetch('/physio/exercises', { method: 'POST', body: JSON.stringify(exerciseData) }),
    getAllExercises: () => apiFetch('/physio/exercises'),
    createPlan: (planData) => apiFetch('/physio/create-plan', { method: 'POST', body: JSON.stringify(planData) }),
    getPendingRequests: () => apiFetch('/physio/pending-requests'),
    respondRequest: (requestId, accept) => apiFetch(`/physio/respond-request/${requestId}?accept=${accept}`, { method: 'POST' }),
  },
  ai: {
    getPattern: (exerciseId) => apiFetch(`/ai/pattern/${exerciseId}`),
  },
  admin: {
    createPhysio: (data) => apiFetch('/admin/create-physio', { method: 'POST', body: JSON.stringify(data) }),
    getPhysiotherapists: () => apiFetch('/admin/physiotherapists'),
    deletePhysio: (userId) => apiFetch(`/admin/physiotherapist/${userId}`, { method: 'DELETE' }),
  }
};
