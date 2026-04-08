import axios from "axios";

const API = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "https://rentify11.onrender.com",
  withCredentials: true,
});

export default API;