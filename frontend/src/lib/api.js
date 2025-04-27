import axios from "axios";

const api = axios.create({
    baseURL: process.env.SERVER_URL,
    withCredentials: false,
});

export default api;
