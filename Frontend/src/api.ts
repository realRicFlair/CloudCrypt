import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8443/api/",
  withCredentials: true
});

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

let csrfMemoryToken: string | null = null;
export function setCsrfToken(token: string) {
  csrfMemoryToken = token;
}

export function clearCsrfToken() {
  csrfMemoryToken = null;
}

let encryptionKeyMemory: string | null = null;
export function setEncryptionKeyMemory(key: string | null) {
  encryptionKeyMemory = key;
}


api.interceptors.request.use(
  (config) => {
    // try memory first (if login handler called setCsrfToken)
    let csrfToken = csrfMemoryToken;
    // fallback to cookie if it exists
    if (!csrfToken) {
      csrfToken = getCookie("csrf_token");
    }
    if (csrfToken) {
      config.headers["X-CSRF-TOKEN"] = csrfToken;
    }

    if (encryptionKeyMemory) {
      config.headers["X-Encryption-Key"] = encryptionKeyMemory;
    }

    return config;
  },
  (error) => Promise.reject(error)
);



export const updateProfile = (data: { username?: string; email?: string; current_password?: string; new_password?: string }) => {
  return api.post("auth/profile", data);
};

export const uploadAvatar = (file: File) => {
  const formData = new FormData();
  formData.append("avatar", file);
  return api.post("auth/avatar", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const swapKeyMode = (mode: "server" | "user", password: string) => {
  return api.post("auth/key-mode", { mode, password });
};

// Share API

export const shareFile = (path: string, isFolder: boolean, password?: string, directDownload?: boolean) => {
  return api.post("share/create", { path, is_folder: isFolder, password, direct_download: directDownload });
};

export const unshareFile = (shareId: string) => {
  return api.delete(`share/${shareId}`);
};

export const getSharedFiles = () => {
  return api.get("share/list");
};

export const getShareInfo = (shareId: string) => {
  return api.get(`share/${shareId}/info`);
};

export const downloadSharedFile = (shareId: string, password?: string) => {
  return api.post(`share/${shareId}/download`, { password }, {
    responseType: 'blob'
  });
};


export const getUsage = () => {
  return api.get("files/usage");
};

export default api;
