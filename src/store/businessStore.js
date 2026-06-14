import { create } from 'zustand';

export const useBusinessStore = create((set) => ({
  products: [],
  sales: [],
  reportStatus: 'idle',
  reportError: '',
  dataStatus: 'idle',
  dataError: '',
  setProducts: (products) => set({ products }),
  setSales: (sales) => set({ sales }),
  setReportStatus: (reportStatus) => set({ reportStatus }),
  setReportError: (reportError) => set({ reportError }),
  setDataStatus: (dataStatus) => set({ dataStatus }),
  setDataError: (dataError) => set({ dataError }),
  resetBusinessData: () =>
    set({
      products: [],
      sales: [],
      reportStatus: 'idle',
      reportError: '',
      dataStatus: 'idle',
      dataError: ''
    })
}));
