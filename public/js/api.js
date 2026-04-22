// api.js — HTTP client for API
const API = {
  baseURL: '/api',

  getToken() {
    return localStorage.getItem('practday_token');
  },

  async request(method, url, data = null) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };

    const token = this.getToken();
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    if (data) opts.body = JSON.stringify(data);

    try {
      const res = await fetch(this.baseURL + url, opts);
      const json = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          Auth.logout();
          Router.navigate('/login');
        }
        throw new Error(json.error || 'Ошибка сервера');
      }
      return json;
    } catch (err) {
      throw err;
    }
  },

  get(url) { return this.request('GET', url); },
  post(url, data) { return this.request('POST', url, data); },
  put(url, data) { return this.request('PUT', url, data); },
  delete(url) { return this.request('DELETE', url); },
};
