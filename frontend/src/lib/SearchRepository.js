const STORAGE_KEY = 'subhouz_search_history';

const SearchRepository = {
  /**
   * Saves a search term to local storage history.
   * @param {string} term Query term
   */
  saveSearch(term) {
    if (!term || !term.trim()) return;
    const clean = term.trim();
    const history = this.getSearchHistory();
    const updated = [clean, ...history.filter(h => h !== clean)].slice(0, 5);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('[SearchRepository] Error saving search:', e);
    }
  },

  /**
   * Retrieves persistent search query history.
   * @returns {Array<string>} History array
   */
  getSearchHistory() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('[SearchRepository] Error loading search history:', e);
      return [];
    }
  },

  /**
   * Clears the search history.
   */
  clearHistory() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('[SearchRepository] Error clearing history:', e);
    }
  }
};

export default SearchRepository;
