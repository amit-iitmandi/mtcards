import axios from "axios";

const getBaseURL = () => process.env.REACT_APP_API_URL || "";

export const apiUrl = (path) => {
  const baseURL = getBaseURL();
  return baseURL ? `${baseURL}${path}` : path;
};

const api = axios.create({
  baseURL: getBaseURL(),
});

export default api;
