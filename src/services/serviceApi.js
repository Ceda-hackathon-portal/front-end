import { apiRequest } from "./apiClient";
async function request(path, options) {
  const result = await apiRequest("/service" + path, options);
  return result?.data ?? result;
}
export const serviceApi = {
  get: (path) => request(path),
  post: (path, body = {}) => request(path, { method: "POST", body }),
  put: (path, body) => request(path, { method: "PUT", body }),
};
