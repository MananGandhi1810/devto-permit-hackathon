import axios from "axios";

const api = axios.create({
    baseURL: process.env.SERVER_URL,
    withCredentials: false,
    headers: {},
    validateStatus: false
});

api.interceptors.request.use(
    (config) => {
        const userString = localStorage.getItem("user");
        if (userString) {
            const user = JSON.parse(userString);
            if (user && user.token) {
                config.headers.Authorization = `Bearer ${user.token}`;
            }
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    },
);

export default api;
