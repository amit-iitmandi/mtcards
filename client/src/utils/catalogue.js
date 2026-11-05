import { useEffect, useState } from 'react';
import axios from 'axios';
import { apiUrl } from './api';

// Reuse a request while the homepage showcase and catalogue mount together.
let pendingCatalogueRequest = null;

function fetchCatalogue() {
  if (!pendingCatalogueRequest) {
    const request = axios.get(apiUrl('/allPost'), { timeout: 15000 })
      .then(({ data }) => {
        if (!Array.isArray(data)) throw new Error('Invalid catalogue response');
        return data;
      })
      .finally(() => {
        if (pendingCatalogueRequest === request) pendingCatalogueRequest = null;
      });
    pendingCatalogueRequest = request;
  }
  return pendingCatalogueRequest;
}

export function useCatalogueCards() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    fetchCatalogue()
      .then(cards => { if (active) setPosts(cards); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);

  return { posts, loading, error, retry: () => setAttempt(value => value + 1) };
}
