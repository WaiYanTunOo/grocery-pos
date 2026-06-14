import { useEffect } from 'react';
import { useAuth } from './AuthContext.jsx';
import { subscribeStoreData } from '../services/firestoreService.js';
import { useBusinessStore } from '../store/businessStore.js';

export function DataProvider({ children }) {
  const { user, storeId } = useAuth();
  const setProducts = useBusinessStore((state) => state.setProducts);
  const setDataStatus = useBusinessStore((state) => state.setDataStatus);
  const setDataError = useBusinessStore((state) => state.setDataError);
  const resetBusinessData = useBusinessStore((state) => state.resetBusinessData);

  useEffect(() => {
    if (!user) {
      resetBusinessData();
      return undefined;
    }

    setDataStatus('loading');
    const unsubscribe = subscribeStoreData(storeId, {
      onProducts: (products) => {
        setProducts(products);
        setDataStatus('ready');
      },
      onError: (error) => {
        console.error(error);
        setDataError(error.message || 'Data loading failed.');
        setDataStatus('error');
      }
    });

    return () => unsubscribe();
  }, [resetBusinessData, setDataError, setDataStatus, setProducts, storeId, user]);

  return children;
}
