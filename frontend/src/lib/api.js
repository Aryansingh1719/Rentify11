import axios from 'axios';

const raw = process.env.NEXT_PUBLIC_API_URL || 'https://rentify11.onrender.com';
export const apiBaseUrl = raw.replace(/\/$/, '');

const API = axios.create({
  baseURL: "https://rentify11.onrender.com",
  withCredentials: true   // 🔥 THIS IS THE FIX
});

export default API;
