import { useEffect, useState } from 'react';

export function go(to) {
  if (window.location.pathname !== to) window.history.pushState({}, '', to);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function usePath() {
  const [path, setPath] = useState(() => window.location.pathname);
  useEffect(() => {
    const sync = () => setPath(window.location.pathname);
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);
  return path;
}

export function useTitle(text) {
  useEffect(() => {
    document.title = text ? `${text} · Kids Blast` : 'Kids Blast';
  }, [text]);
}
