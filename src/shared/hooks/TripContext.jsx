import { createContext, useContext, useMemo, useCallback } from 'react';
import { useItems } from './useItems';
import { useStops } from './useStops';
import { usePlaceData } from './usePlaceData';
import { useExpenses } from './useExpenses';
import { useLivePrices } from './useLivePrices';
import { useItemFiles } from './useItemFiles';
import { useToast } from './useToast';

const TripDataContext = createContext(null);
const TripActionsContext = createContext(null);

export function TripProvider({ email, children }) {
  const { toast, showToast } = useToast();
  const itemsHook = useItems(email, showToast);
  const stopsHook = useStops();
  const { places, getPlaceData } = usePlaceData();
  const expensesHook = useExpenses();
  const livePrices = useLivePrices(itemsHook.staysWithKeys, stopsHook.stops, itemsHook.updateItem);
  const { files, setFile, removeFile, clearFiles } = useItemFiles(itemsHook.items);

  const dataError = itemsHook.error || stopsHook.error || expensesHook.error;
  const retryAll = useCallback(() => {
    itemsHook.retry();
    stopsHook.retry();
    expensesHook.retry();
  }, [itemsHook.retry, stopsHook.retry, expensesHook.retry]);

  // Memoized expense-per-item lookup — used by multiple pages
  const expenseMap = useMemo(() => {
    const map = {};
    (expensesHook.expenses || []).forEach(e => { map[e.item_id] = (map[e.item_id] || 0) + Number(e.amount || 0); });
    return map;
  }, [expensesHook.expenses]);

  // Data changes frequently — items, expenses, prices update via realtime
  const data = useMemo(() => ({
    items: itemsHook.items,
    loaded: itemsHook.loaded,
    dataError,
    retryAll,
    files,
    livePrices,
    toast,
    stops: stopsHook.stops,
    stopsLoaded: stopsHook.loaded,
    places,
    expenses: expensesHook.expenses,
    expenseMap,
    email,
  }), [itemsHook.items, itemsHook.loaded, dataError, retryAll, files, livePrices, toast, stopsHook.stops, stopsHook.loaded, places, expensesHook.expenses, expenseMap, email]);

  // Actions are stable callbacks — rarely change
  const actions = useMemo(() => ({
    updateItem: itemsHook.updateItem,
    setStatus: itemsHook.setStatus,
    addItem: itemsHook.addItem,
    deleteItem: itemsHook.deleteItem,
    setFile,
    removeFile,
    clearFiles,
    updateStop: stopsHook.updateStop,
    addStop: stopsHook.addStop,
    deleteStop: stopsHook.deleteStop,
    getPlaceData,
    addExpense: expensesHook.addExpense,
    updateExpense: expensesHook.updateExpense,
    deleteExpense: expensesHook.deleteExpense,
    showToast,
  }), [
    itemsHook.updateItem, itemsHook.setStatus, itemsHook.addItem, itemsHook.deleteItem,
    setFile, removeFile, clearFiles,
    stopsHook.updateStop, stopsHook.addStop, stopsHook.deleteStop,
    getPlaceData,
    expensesHook.addExpense, expensesHook.updateExpense, expensesHook.deleteExpense,
    showToast,
  ]);

  return (
    <TripDataContext.Provider value={data}>
      <TripActionsContext.Provider value={actions}>
        {children}
      </TripActionsContext.Provider>
    </TripDataContext.Provider>
  );
}

// Components that only need actions won't re-render when data changes
export function useTrip() {
  const data = useContext(TripDataContext);
  const actions = useContext(TripActionsContext);
  if (!data || !actions) throw new Error('useTrip must be used within TripProvider');
  return { ...data, ...actions };
}

// Targeted hooks for components that only need data or only need actions
export function useTripData() {
  const ctx = useContext(TripDataContext);
  if (!ctx) throw new Error('useTripData must be used within TripProvider');
  return ctx;
}

export function useTripActions() {
  const ctx = useContext(TripActionsContext);
  if (!ctx) throw new Error('useTripActions must be used within TripProvider');
  return ctx;
}
