import React, {
  createContext,
  useContext,
  useRef,
  MutableRefObject,
} from "react";

/* ───────── public shape that StemPlayer & MasterController will call ──────── */
export interface MixerHandle {
  playAll: () => void;
  pauseAll: () => void;
  jump: (sec: number) => void;
}

/* internal context payload */
interface RegistryApi {
  mixers: MutableRefObject<MixerHandle[]>;
  register: (h: MixerHandle) => void;
  unregister: (h: MixerHandle) => void;
}

/* create the context (no default) */
const MixerContext = createContext<RegistryApi | null>(null);

/* ───────── provider ───────── */
export const MixerProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const mixers = useRef<MixerHandle[]>([]);

  const register = (h: MixerHandle) => {
    mixers.current.push(h);
  };
  const unregister = (h: MixerHandle) => {
    mixers.current = mixers.current.filter((m) => m !== h);
  };

  return (
    <MixerContext.Provider value={{ mixers, register, unregister }}>
      {children}
    </MixerContext.Provider>
  );
};

/* ───────── consumer hook ───────── */
export const useMixerRegistry = () => {
  const api = useContext(MixerContext);
  if (!api) throw new Error("useMixerRegistry must be inside <MixerProvider>");
  return api;
};

/* (no default export; use the named ones above) */
