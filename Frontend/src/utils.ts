import axios from 'axios';
import config from './config';

type User = {
  name: string;
  isAdmin: boolean;
  isBackend: boolean;
  iat: number;
  exp: number;
};

export function storeToken(token: string) {
  localStorage.setItem('token', token);
}

export function clearToken() {
  localStorage.removeItem('token');
}

export function validateStoredToken(): Promise<User | null> {
  const token = localStorage.getItem('token');
  if (!token) {
    return Promise.resolve(null);
  }
  return axios
    .post(
      `${config.apiBaseUrl}/decode`,
      {},
      {
        headers: {
          'X-Authorization': token,
        },
      },
    )
    .then((response) => {
      return Promise.resolve(response.data.user);
    })
    .catch((error) => {
      console.error('Error validating token:', error);
      return Promise.resolve(null);
    });
}
