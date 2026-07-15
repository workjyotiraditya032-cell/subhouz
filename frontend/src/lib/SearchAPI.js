import api from './api';

const SearchAPI = {
  /**
   * Fetches grouped suggestions from backend suggestion engine.
   * @param {string} query The input query
   * @param {AbortSignal} signal Abort signal for request cancellation
   * @returns {Promise<object>} Grouped suggestions payload
   */
  async getSuggestions(query, signal) {
    const response = await api.get('/search/suggestions', {
      params: { q: query },
      signal
    });
    return response.data;
  },

  /**
   * Performs ranked smart search querying backend weighted index.
   * @param {string} query The input query
   * @param {AbortSignal} signal Abort signal for request cancellation
   * @returns {Promise<Array>} Ranked properties list
   */
  async searchProperties(query, signal) {
    const response = await api.get('/search', {
      params: { q: query },
      signal
    });
    return response.data;
  }
};

export default SearchAPI;
