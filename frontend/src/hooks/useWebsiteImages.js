import { useState, useEffect } from 'react';
import api from '../lib/api';

// In-memory cache for single images and list of images
const imageCache = {};
const listCache = {};

// Deduplication map to prevent parallel requests for the same resources
const pendingImagePromises = {};
const pendingListPromises = {};

/**
 * Hook to fetch a single public website image by imageKey.
 * Endpoint: /api/website-images/public/{imageKey}
 * 
 * Returns: { image, title, alt_text, loading, error }
 */
export function useWebsiteImage(imageKey) {
  const [state, setState] = useState(() => {
    if (imageKey && imageCache[imageKey]) {
      return {
        image: imageCache[imageKey].image,
        title: imageCache[imageKey].title,
        alt_text: imageCache[imageKey].alt_text,
        loading: false,
        error: null,
      };
    }
    return {
      image: '',
      title: '',
      alt_text: '',
      loading: !!imageKey,
      error: null,
    };
  });

  useEffect(() => {
    if (!imageKey) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    if (imageCache[imageKey]) {
      setState({
        image: imageCache[imageKey].image,
        title: imageCache[imageKey].title,
        alt_text: imageCache[imageKey].alt_text,
        loading: false,
        error: null,
      });
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    let promise = pendingImagePromises[imageKey];
    if (!promise) {
      promise = api.get(`/website-images/public/${imageKey}`)
        .then(res => {
          const data = res.data;
          const result = {
            image: data.image || '',
            title: data.title || '',
            alt_text: data.alt_text || '',
          };
          imageCache[imageKey] = result;
          delete pendingImagePromises[imageKey];
          return result;
        })
        .catch(err => {
          delete pendingImagePromises[imageKey];
          throw err;
        });
      pendingImagePromises[imageKey] = promise;
    }

    let isMounted = true;
    promise
      .then(result => {
        if (isMounted) {
          setState({
            ...result,
            loading: false,
            error: null,
          });
        }
      })
      .catch(err => {
        if (isMounted) {
          setState({
            image: '',
            title: '',
            alt_text: '',
            loading: false,
            error: err,
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [imageKey]);

  return state;
}

/**
 * Hook to fetch multiple public website images, optionally filtered by category.
 * Endpoint: /api/website-images/public?category={category}
 * 
 * Returns: { images: [...], loading, error }
 */
export function useWebsiteImages(category) {
  const cacheKey = category || 'all';

  const [state, setState] = useState(() => {
    if (listCache[cacheKey]) {
      return {
        images: listCache[cacheKey],
        loading: false,
        error: null,
      };
    }
    return {
      images: [],
      loading: true,
      error: null,
    };
  });

  useEffect(() => {
    if (listCache[cacheKey]) {
      setState({
        images: listCache[cacheKey],
        loading: false,
        error: null,
      });
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    let promise = pendingListPromises[cacheKey];
    if (!promise) {
      const params = category ? { category } : {};
      promise = api.get('/website-images/public', { params })
        .then(res => {
          const list = (res.data || []).map(img => ({
            ...img,
            image: img.image || '',
          }));
          listCache[cacheKey] = list;
          delete pendingListPromises[cacheKey];
          return list;
        })
        .catch(err => {
          delete pendingListPromises[cacheKey];
          throw err;
        });
      pendingListPromises[cacheKey] = promise;
    }

    let isMounted = true;
    promise
      .then(result => {
        if (isMounted) {
          setState({
            images: result,
            loading: false,
            error: null,
          });
        }
      })
      .catch(err => {
        if (isMounted) {
          setState({
            images: [],
            loading: false,
            error: err,
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [cacheKey, category]);

  return state;
}
