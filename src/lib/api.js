const API_ROOT = '/api/v1';
let accessToken = null;
let refreshInFlight = null;
let lessonSaveQueue = Promise.resolve();

export function setAccessToken(value) {
  accessToken = value || null;
}

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function refreshAccessToken() {
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API_ROOT}/auth/refresh`, { method: 'POST', credentials: 'include' })
      .then(async (response) => {
        if (!response.ok) throw new ApiError('Your session expired. Sign in again.', response.status);
        const payload = await response.json();
        setAccessToken(payload.accessToken);
        return payload.accessToken;
      })
      .finally(() => { refreshInFlight = null; });
  }
  return refreshInFlight;
}

async function request(path, options = {}, canRefresh = true) {
  const headers = new Headers(options.headers || {});
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${API_ROOT}${path}`, { ...options, headers, credentials: 'include' });
  if (response.status === 401 && canRefresh && accessToken && !path.startsWith('/auth/')) {
    try { await refreshAccessToken(); return request(path, options, false); }
    catch { setAccessToken(null); }
  }
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try { message = (await response.json()).detail || message; } catch { /* non-JSON response */ }
    throw new ApiError(message, response.status);
  }
  if (response.status === 204) return null;
  const contentType = response.headers.get('content-type') || '';
  return contentType.includes('application/json') ? response.json() : response.blob();
}

export const api = {
  request,
  async signIn(email, password) {
    return request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }, false);
  },
  async signUp({ email, password, displayName, workspaceName }) {
    return request('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, displayName, workspaceName }) }, false);
  },
  async restoreSession() { return refreshAccessToken(); },
  async signOut() {
    try { await request('/auth/logout', { method: 'POST' }, false); }
    finally { setAccessToken(null); }
  },
  async lessons() { return request('/lessons'); },
  async generationStatus() { return request('/generation-status'); },
  async syllabi() { return request('/syllabi'); },
  async uploadSyllabus({ file, board, grade, subject }) {
    const body = new FormData();
    body.append('file', file);
    body.append('board', board);
    body.append('grade', grade);
    body.append('subject', subject);
    return request('/syllabi', { method: 'POST', body });
  },
  async deleteSyllabus(id) { return request(`/syllabi/${encodeURIComponent(id)}`, { method: 'DELETE' }); },
  async lesson(id) { return request(`/lessons/${encodeURIComponent(id)}`); },
  async sourceImages(id) { return request(`/lessons/${encodeURIComponent(id)}/source-images`); },
  saveLesson(id, content) {
    const save = lessonSaveQueue.catch(() => {}).then(() => request(`/lessons/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ content }) }));
    lessonSaveQueue = save;
    return save;
  },
  async uploadLesson({ file, board, grade, subject, language }) {
    const body = new FormData();
    body.append('file', file);
    body.append('board', board);
    body.append('grade', grade);
    body.append('subject', subject);
    body.append('language', language);
    return request('/lessons', { method: 'POST', body });
  },
  async job(id) { return request(`/jobs/${encodeURIComponent(id)}`); },
  async lessonJobs(id) { return request(`/lessons/${encodeURIComponent(id)}/jobs`); },
  async retryLesson(id) { return request(`/lessons/${encodeURIComponent(id)}/retry`, { method: 'POST' }); },
  async createExport(lessonId, params) {
    return request(`/lessons/${encodeURIComponent(lessonId)}/exports`, { method: 'POST', body: JSON.stringify({ params }) });
  },
  async downloadExport(jobId) { return request(`/jobs/${encodeURIComponent(jobId)}/download`); },
  async sendFeedback(payload) { return request('/feedback', { method: 'POST', body: JSON.stringify(payload) }); },
};
