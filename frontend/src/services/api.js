const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
// Helper function to get auth header
const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Generic API call function
const apiCall = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Something went wrong');
    }

    return data;
  } catch (error) {
    console.error('API call error:', error);
    throw error;
  }
};

// Auth API
export const register = async (userData) => {
  const data = await apiCall('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
  return data.data;
};

export const login = async (credentials) => {
  const data = await apiCall('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
  return data.data;
};

export const getCurrentUser = async () => {
  const data = await apiCall('/auth/me');
  return data.data;
};

// PDF API
export const uploadPDFToServer = async (file, onProgress) => {
  const formData = new FormData();
  formData.append('pdf', file);

  const token = localStorage.getItem('token');
  const url = `${API_BASE_URL}/pdfs/upload`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Upload failed');
    }

    const data = await response.json();
    return {
      id: data.data.pdf.id,
      name: data.data.pdf.originalName,
      size: data.data.pdf.fileSize,
      url: `${API_BASE_URL}/pdfs/${data.data.pdf.id}`,
      pages: data.data.pdf.pages,
      uploadDate: new Date(data.data.pdf.uploadDate).toLocaleDateString(),
      uploadTime: data.data.pdf.uploadDate,
      backendId: data.data.pdf.id,
      source: 'backend',
      annotationsCount: data.data.pdf.annotationsCount
    };
  } catch (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }
};

export const getUserPDFs = async () => {
  const data = await apiCall('/pdfs');
  return data.data.pdfs;
};

export const getPDFUrl = (pdfId) => {
  return `${API_BASE_URL}/pdfs/${pdfId}`;
};

export const getPDFAnnotations = async (pdfId) => {
  const data = await apiCall(`/pdfs/${pdfId}/annotations`);
  return data.data.annotations;
};

export const savePDFAnnotations = async (pdfId, annotations) => {
  const data = await apiCall(`/pdfs/${pdfId}/annotations`, {
    method: 'PUT',
    body: JSON.stringify({ annotations }),
  });
  return data.data;
};

export const deletePDFFromServer = async (pdfId) => {
  await apiCall(`/pdfs/${pdfId}`, {
    method: 'DELETE',
  });
  return true;
};

// Check if backend is available
export const isBackendAvailable = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      timeout: 5000,
    });
    return response.ok;
  } catch (error) {
    console.log('Backend not available');
    return false;
  }
};