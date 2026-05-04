import { createContext, useContext, useMemo } from 'react';
import { useItems } from './useItems';
import { useStops } from './useStops';
import { usePlaceData } from './usePlaceData';
import { useExpenses } from './useExpenses';

const TripContext = createContext(null);

export function TripProvider({ email, children }) {
  const itemsHook = useItems(email);
  const stopsHook = useStops();
  const { places, getPlaceData } = usePlaceData();
  const expensesHook = useExpenses();

  const value = useMemo(() => ({
    // Data
    items: itemsHook.items,
    loaded: itemsHook.loaded,
    files: itemsHook.files,
    livePrices: itemsHook.livePrices,
    toast: itemsHook.toast,
    stops: stopsHook.stops,
    stopsLoaded: stopsHook.loaded,
    places,
    expenses: expensesHook.expenses,
    // Item actions
    updateItem: itemsHook.updateItem,
    setStatus: itemsHook.setStatus,
    addItem: itemsHook.addItem,
    deleteItem: itemsHook.deleteItem,
    setFile: itemsHook.setFile,
    removeFile: itemsHook.removeFile,
    // Stop actions
    updateStop: stopsHook.updateStop,
    addStop: stopsHook.addStop,
    deleteStop: stopsHook.deleteStop,
    // Place actions
    getPlaceData,
    // Expense actions
    addExpense: expensesHook.addExpense,
    updateExpense: expensesHook.updateExpense,
    deleteExpense: expensesHook.deleteExpense,
    // User
    email,
  }), [
    itemsHook.items, itemsHook.loaded, itemsHook.files, itemsHook.livePrices, itemsHook.toast,
    itemsHook.updateItem, itemsHook.setStatus, itemsHook.addItem, itemsHook.deleteItem, itemsHook.setFile, itemsHook.removeFile,
    stopsHook.stops, stopsHook.loaded, stopsHook.updateStop, stopsHook.addStop, stopsHook.deleteStop,
    places, getPlaceData,
    expensesHook.expenses, expensesHook.addExpense, expensesHook.updateExpense, expensesHook.deleteExpense,
    email,
  ]);

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
}

export function useTrip() {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error('useTrip must be used within TripProvider');
  return ctx;
}
