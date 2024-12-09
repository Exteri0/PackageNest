import { describe, it, expect, vi } from 'vitest';
import axios from 'axios';
import { storeToken, clearToken, validateStoredToken } from '../../src/utils'; // Adjust the path
import config from '../../src/config';

vi.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock localStorage
    const localStorageMock = (() => {
      let store: Record<string, string> = {};
      return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
          store[key] = value;
        },
        removeItem: (key: string) => {
          delete store[key];
        },
        clear: () => {
          store = {};
        },
      };
    })();
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
  });

  describe('storeToken', () => {
    it('stores the token in localStorage', () => {
      storeToken('myToken123');
      expect(localStorage.getItem('token')).toBe('myToken123');
    });
  });

  describe('clearToken', () => {
    it('removes the token from localStorage', () => {
      localStorage.setItem('token', 'anotherToken');
      clearToken();
      expect(localStorage.getItem('token')).toBeNull();
    });
  });

  describe('validateStoredToken', () => {
    it('returns null if no token is stored', async () => {
      expect(localStorage.getItem('token')).toBeNull();
      const result = await validateStoredToken();
      expect(result).toBeNull();
    });

    it('sends a request to decode endpoint if token is present', async () => {
      localStorage.setItem('token', 'validToken');
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          user: {
            name: 'TestUser',
            isAdmin: true,
            isBackend: false,
            iat: 12345,
            exp: 67890,
          },
        },
      });

      const result = await validateStoredToken();
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `${config.apiBaseUrl}/decode`,
        {},
        {
          headers: {
            'X-Authorization': 'validToken',
          },
        },
      );
      expect(result).toEqual({
        name: 'TestUser',
        isAdmin: true,
        isBackend: false,
        iat: 12345,
        exp: 67890,
      });
    });

    it('returns null if the request fails', async () => {
      localStorage.setItem('token', 'invalidToken');
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));

      const result = await validateStoredToken();
      expect(result).toBeNull();
    });
  });
});
