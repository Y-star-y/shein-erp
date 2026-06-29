"use client";

import { Alert } from "antd";
import { AlertCircle, Check } from "lucide-react";
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

type ModalNoticeType = "success" | "error";

type ModalNoticeContextValue = {
  showModalNotice: (type: ModalNoticeType, message: string) => void;
};

const ModalNoticeContext = createContext<ModalNoticeContextValue | null>(null);

export function ModalNoticeProvider({ children }: { children: ReactNode }) {
  const [notice, setNotice] = useState<{ type: ModalNoticeType; message: string } | null>(null);
  const timerRef = useRef<number | null>(null);

  const showModalNotice = useCallback((type: ModalNoticeType, message: string) => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }

    setNotice({ type, message });
    timerRef.current = window.setTimeout(() => {
      setNotice(null);
      timerRef.current = null;
    }, 2400);
  }, []);

  return (
    <ModalNoticeContext.Provider value={{ showModalNotice }}>
      <div className="app-modal-shell">
        <div aria-live="polite" className="modal-notice-layer">
          {notice ? (
            <Alert
              className="modal-notice"
              icon={notice.type === "success" ? <Check size={16} /> : <AlertCircle size={16} />}
              showIcon
              title={notice.message}
              type={notice.type === "error" ? "error" : "success"}
            />
          ) : null}
        </div>
        {children}
      </div>
    </ModalNoticeContext.Provider>
  );
}

export function useModalNotice() {
  return useContext(ModalNoticeContext);
}
