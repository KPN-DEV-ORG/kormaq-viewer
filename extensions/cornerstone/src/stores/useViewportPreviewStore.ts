import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type ViewportPreviewState = {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
};

export const useViewportPreviewStore = create<ViewportPreviewState>()(
  persist(
    set => ({
      enabled: true,
      setEnabled: enabled => set({ enabled }),
    }),
    {
      name: 'ohif.viewportPreview',
      storage: createJSONStorage(() => localStorage),
      partialize: ({ enabled }) => ({ enabled }),
    }
  )
);
