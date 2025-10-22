// src/services/mockApi.js

// Mock user database
const mockUsers = [
  {
    id: '1',
    name: 'Demo User',
    email: 'demo@example.com',
    password: 'password123'
  }
];

// Get user PDFs from localStorage
export const getUserPDFs = async (userId) => {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  try {
    const stored = localStorage.getItem(`userPDFs_${userId}`);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading PDFs:', error);
    return [];
  }
};

// Save PDF to localStorage
export const saveUserPDF = async (userId, pdfData) => {
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const userPDFs = await getUserPDFs(userId);
  const updatedPDFs = [pdfData, ...userPDFs];
  
  localStorage.setItem(`userPDFs_${userId}`, JSON.stringify(updatedPDFs));
  return pdfData;
};

// Delete PDF from localStorage
export const deleteUserPDF = async (userId, pdfId) => {
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const userPDFs = await getUserPDFs(userId);
  const updatedPDFs = userPDFs.filter(pdf => pdf.id !== pdfId);
  
  localStorage.setItem(`userPDFs_${userId}`, JSON.stringify(updatedPDFs));
  return true;
};

// Mock login
export const mockLogin = async (email, password) => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const user = mockUsers.find(u => u.email === email && u.password === password);
  if (!user) {
    throw new Error('Invalid email or password');
  }

  // Return user without password
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

// Mock register
export const mockRegister = async (name, email, password) => {
  await new Promise(resolve => setTimeout(resolve, 1000));

  if (mockUsers.find(u => u.email === email)) {
    throw new Error('User already exists with this email');
  }

  const newUser = {
    id: Date.now().toString(),
    name,
    email,
    password
  };

  mockUsers.push(newUser);
  
  // Initialize empty PDFs array for new user
  localStorage.setItem(`userPDFs_${newUser.id}`, JSON.stringify([]));

  const { password: _, ...userWithoutPassword } = newUser;
  return userWithoutPassword;
};