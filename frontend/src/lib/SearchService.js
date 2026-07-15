import SearchAPI from './SearchAPI';

let suggestionsAbort = null;
let searchAbort = null;

const SearchService = {
  /**
   * Fetches suggestions dynamically. Cancels preceding calls.
   * @param {string} query Search input
   * @returns {Promise<object>} Grouped suggestions data
   */
  async getSuggestions(query) {
    if (suggestionsAbort) {
      suggestionsAbort.abort();
    }
    suggestionsAbort = new AbortController();
    
    try {
      return await SearchAPI.getSuggestions(query, suggestionsAbort.signal);
    } catch (e) {
      if (e.name === 'CanceledError' || e.name === 'AbortError') return null;
      throw e;
    }
  },

  /**
   * Performs ranked smart search. Cancels preceding calls.
   * @param {string} query Search input
   * @returns {Promise<Array>} Ranked properties
   */
  async searchProperties(query) {
    if (searchAbort) {
      searchAbort.abort();
    }
    searchAbort = new AbortController();
    
    try {
      return await SearchAPI.searchProperties(query, searchAbort.signal);
    } catch (e) {
      if (e.name === 'CanceledError' || e.name === 'AbortError') return null;
      throw e;
    }
  }
};

export default SearchService;
