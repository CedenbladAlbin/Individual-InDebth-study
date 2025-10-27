
// Get auth headers with token from localStorage
// @ts-ignore
export function getAuthHeaders(contentType = false) {
  const token = localStorage.getItem('token');
  /** @type {Record<string, string>} */
  const headers = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  if (contentType) {
    headers['Content-Type'] = 'application/json';
  }
  
  return headers;
}

// Check if user is authenticated (has valid token)
export function isAuthenticated() {
  return !!localStorage.getItem('token');
}

// Get current user token
export function getToken() {
  return localStorage.getItem('token');
}

// Clear authentication
export function clearAuth() {
  localStorage.removeItem('token');
}

// Store authentication token
// @ts-ignore
export function setToken(token) {
  localStorage.setItem('token', token);
}

// ========== API WRAPPERS ==========

// Generic authenticated fetch wrapper
// @ts-ignore
export async function authenticatedFetch(url, options = {}) {
  const token = localStorage.getItem('token');
  
  if (!token) {
    throw new Error('Not authenticated');
  }

  const headers = {
    // @ts-ignore
    ...getAuthHeaders(!!options.body),
    // @ts-ignore
    ...options.headers
  };

  return fetch(url, {
    ...options,
    headers
  });
}

// ========== GAME CONTENT API ==========

// Fetch all game content for a specific game
// @ts-ignore
export async function fetchAllGameContent(gameId) {
  const token = localStorage.getItem('token');
  if (!token) return { npcs: [], players: [], items: [], scenes: [] };

  try {
    const [npcRes, playerRes, itemRes, sceneRes] = await Promise.all([
      authenticatedFetch(`/api/game-content?npc=1&gameId=${gameId}`),
      authenticatedFetch(`/api/game-content?player=1&gameId=${gameId}`),
      authenticatedFetch(`/api/game-content?item=1&gameId=${gameId}`),
      authenticatedFetch(`/api/game-content?scene=1&gameId=${gameId}`)
    ]);

    return {
      npcs: npcRes.ok ? await npcRes.json() : [],
      players: playerRes.ok ? await playerRes.json() : [],
      items: itemRes.ok ? await itemRes.json() : [],
      scenes: sceneRes.ok ? await sceneRes.json() : []
    };
  } catch (error) {
    console.error('Failed to fetch game content:', error);
    return { npcs: [], players: [], items: [], scenes: [] };
  }
}

// Build entity maps from arrays
// @ts-ignore
export function buildEntityMaps({ npcs = [], players = [], items = [], scenes = [] }) {
  return {
    npcMap: Object.fromEntries(npcs.map(n => [n._id, n])),
    sceneMap: Object.fromEntries(scenes.map(s => [s._id, s])),
    playerMap: Object.fromEntries(players.map(p => [p._id, p])),
    itemMap: Object.fromEntries(items.map(i => [i._id, i]))
  };
}

// ========== ENTITY API ==========

// Generic operations
export const entityApi = {
  // Delete entity
  // @ts-ignore
  async delete(type, id) {
    const response = await authenticatedFetch(`/api/game-content?type=${type}&id=${id}`, {
      method: 'DELETE'
    });
    return response.ok;
  },

  // Connect entities
  // @ts-ignore
  async connect(fromType, fromId, toType, toId) {
    let body = {};
    
    if (fromType === 'item') {
      body = { itemId: fromId, targetType: toType, targetId: toId };
    } else if (fromType === 'npc' && toType === 'scene') {
      body = { npcId: fromId, sceneId: toId };
    }
    
    const response = await authenticatedFetch('/api/game-content/connect', {
      method: 'POST',
      body: JSON.stringify(body)
    });
    return response.ok;
  },

  // Disconnect entities
  // @ts-ignore
  async disconnect(type, fromId, toId) {
    const response = await authenticatedFetch('/api/game-content/disconnect', {
      method: 'POST',
      body: JSON.stringify({ type, fromId, toId })
    });
    return response.ok;
  }
};

// ========== NOTES API ==========

// Notes API
export const notesApi = {
  // Get notes for entity
  // @ts-ignore
  async getAll(type, entityId) {
    const response = await authenticatedFetch(`/api/game-content/notes?type=${type}&entityId=${entityId}`);
    return response.ok ? await response.json() : [];
  },

  // Add note
  // @ts-ignore
  async add(type, entityId, title, text) {
    const response = await authenticatedFetch('/api/game-content/notes', {
      method: 'POST',
      body: JSON.stringify({ type, entityId, title, text })
    });
    return response.ok ? await response.json() : null;
  },

  // Update note
  // @ts-ignore
  async update(noteId, title, text) {
    const response = await authenticatedFetch('/api/game-content/notes', {
      method: 'PUT',
      body: JSON.stringify({ noteId, title, text })
    });
    return response.ok;
  },

  // Delete note
  // @ts-ignore
  async delete(noteId) {
    const response = await authenticatedFetch(`/api/game-content/notes?noteId=${noteId}`, {
      method: 'DELETE'
    });
    return response.ok;
  }
};

// ========== SESSIONS API ==========

// Sessions API
export const sessionsApi = {
  // Get all sessions for game
  // @ts-ignore
  async getAll(gameId) {
    const response = await authenticatedFetch(`/api/sessions?gameId=${gameId}`);
    return response.ok ? await response.json() : [];
  },

  // Delete session
  // @ts-ignore
  async delete(sessionId) {
    const response = await authenticatedFetch(`/api/sessions/${sessionId}`, {
      method: 'DELETE'
    });
    return response.ok;
  },

  // Update session
  // @ts-ignore
  async update(sessionId, data) {
    const response = await authenticatedFetch(`/api/sessions/${sessionId}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
    return response.ok;
  }
};