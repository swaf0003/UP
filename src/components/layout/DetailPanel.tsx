import { ReactNode, createContext, useContext, useState } from "react";

type DetailPanelContextValue = {
  content: ReactNode | null;
  setContent: (node: ReactNode | null) => void;
};

const DetailPanelContext = createContext<DetailPanelContextValue>({
  content: null,
  setContent: () => {},
});

export const DetailPanelProvider = ({ children }: { children: ReactNode }) => {
  const [content, setContent] = useState<ReactNode | null>(null);
  return (
    <DetailPanelContext.Provider value={{ content, setContent }}>
      {children}
    </DetailPanelContext.Provider>
  );
};

export const useDetailPanel = () => useContext(DetailPanelContext);
