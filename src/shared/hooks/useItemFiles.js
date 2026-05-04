import { useState, useEffect, useCallback } from 'react';
import { listFiles } from '../../services/storage';

// Manage file state for items
// Loads files for confirmed items on mount and when items change status
export function useItemFiles(items) {
  const [files, setFilesState] = useState({});

  useEffect(() => {
    const confItems = items.filter(it => it.status === 'conf');
    if (confItems.length === 0) return;

    Promise.allSettled(confItems.map(it => listFiles(it.id).then(f => ({ id: it.id, files: f }))))
      .then(results => {
        const fm = {};
        results.forEach(r => { if (r.status === 'fulfilled' && r.value.files.length > 0) fm[r.value.id] = r.value.files; });
        setFilesState(prev => ({ ...prev, ...fm }));
      });
  }, [items.filter(it => it.status === 'conf').map(it => it.id).join(',')]);

  const setFile = useCallback((id, fileData) => {
    setFilesState(prev => {
      const existing = prev[id] || [];
      if (fileData === null) return { ...prev, [id]: [] };
      if (Array.isArray(fileData)) return { ...prev, [id]: fileData };
      return { ...prev, [id]: [...existing, fileData] };
    });
  }, []);

  const removeFile = useCallback((id, filePath) => {
    setFilesState(prev => ({ ...prev, [id]: (prev[id] || []).filter(f => f.path !== filePath) }));
  }, []);

  const clearFiles = useCallback((id) => {
    setFilesState(prev => { const n = { ...prev }; delete n[id]; return n; });
  }, []);

  return { files, setFile, removeFile, clearFiles };
}
