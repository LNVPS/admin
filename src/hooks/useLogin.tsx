import { useContext, useMemo, useSyncExternalStore } from "react";
import { type LoginSession, LoginState } from "../lib/login";
import { SnortContext } from "@snort/system-react";

export default function useLogin() {
  const session = useSyncExternalStore(
    (c) => LoginState.hook(c),
    () => LoginState.snapshot(),
  );
  const system = useContext(SnortContext);

  return useMemo(
    () =>
      session
        ? {
            type: session.type,
            publicKey: session.publicKey,
            system,
            update: (fx: (ses: LoginSession) => void) =>
              LoginState.updateSession(fx),
            logout: () => LoginState.logout(),
            getSigner: () => LoginState.getSigner(),
          }
        : undefined,
    [session, system],
  );
}
