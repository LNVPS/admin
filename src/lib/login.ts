import { ExternalStore } from "@snort/shared";
import {
  EventPublisher,
  Nip46Signer,
  Nip7Signer,
  type NostrEvent,
  PrivateKeySigner,
} from "@snort/system";
import type { UserRoleInfo } from "./api";

const EXTENSION_WAIT_MS = 5_000;
const EXTENSION_POLL_MS = 50;

export function waitForNostrExtension(timeoutMs: number = EXTENSION_WAIT_MS): Promise<void> {
  return new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs;
    const check = () => {
      if (window.nostr || Date.now() >= deadline) {
        resolve();
      } else {
        setTimeout(check, EXTENSION_POLL_MS);
      }
    };
    check();
  });
}

export class ExtensionSigner extends Nip7Signer {
  async getPubKey(): Promise<string> {
    await waitForNostrExtension();
    return super.getPubKey();
  }

  async sign(ev: NostrEvent): Promise<NostrEvent> {
    await waitForNostrExtension();
    return super.sign(ev);
  }

  async nip4Encrypt(content: string, key: string): Promise<string> {
    await waitForNostrExtension();
    return super.nip4Encrypt(content, key);
  }

  async nip4Decrypt(content: string, otherKey: string): Promise<string> {
    await waitForNostrExtension();
    return super.nip4Decrypt(content, otherKey);
  }

  async nip44Encrypt(content: string, key: string): Promise<string> {
    await waitForNostrExtension();
    return super.nip44Encrypt(content, key);
  }

  async nip44Decrypt(content: string, otherKey: string): Promise<string> {
    await waitForNostrExtension();
    return super.nip44Decrypt(content, otherKey);
  }
}

export interface LoginSession {
  type: "nip7" | "nsec" | "nip46";
  publicKey: string;
  privateKey?: string;
  bunker?: string;
  roles?: UserRoleInfo[];
  rolesLastFetched?: number;
}

class LoginStore extends ExternalStore<LoginSession | undefined> {
  #session?: LoginSession;
  #signer?: EventPublisher;

  constructor() {
    super();
    const s = window.localStorage.getItem("admin_session");
    if (s) {
      this.#session = JSON.parse(s);
      // patch session
      if (this.#session) {
        this.#session.type ??= "nip7";
      }
    }
  }

  takeSnapshot() {
    return this.#session ? { ...this.#session } : undefined;
  }

  logout() {
    this.#session = undefined;
    this.#signer = undefined;
    // Also clear any cached role data
    window.localStorage.removeItem("admin_user_roles");
    this.#save();
  }

  login(pubkey: string, type: LoginSession["type"] = "nip7") {
    this.#session = {
      type: type ?? "nip7",
      publicKey: pubkey,
    };
    this.#save();
  }

  loginPrivateKey(key: string | Uint8Array) {
    const s = new PrivateKeySigner(key);
    this.#session = {
      type: "nsec",
      publicKey: s.getPubKey(),
      privateKey: s.privateKey,
    };
    this.#save();
  }

  loginBunker(url: string, localKey: string, remotePubkey: string) {
    this.#session = {
      type: "nip46",
      publicKey: remotePubkey,
      privateKey: localKey,
      bunker: url,
    };
    this.#save();
  }

  getSigner() {
    if (!this.#signer && this.#session) {
      switch (this.#session.type) {
        case "nsec":
          this.#signer = new EventPublisher(
            new PrivateKeySigner(this.#session.privateKey!),
            this.#session.publicKey,
          );
          break;
        case "nip46":
          this.#signer = new EventPublisher(
            new Nip46Signer(
              this.#session.bunker!,
              new PrivateKeySigner(this.#session.privateKey!),
            ),
            this.#session.publicKey,
          );
          break;
        case "nip7":
          this.#signer = new EventPublisher(
            new ExtensionSigner(),
            this.#session.publicKey,
          );
          break;
      }
    }

    if (this.#signer) {
      return this.#signer;
    }
    throw "Signer not setup!";
  }

  updateSession(fx: (s: LoginSession) => void) {
    if (this.#session) {
      fx(this.#session);
      this.#save();
    }
  }

  // Role management methods
  setRoles(roles: UserRoleInfo[]) {
    if (this.#session) {
      this.#session.roles = roles;
      this.#session.rolesLastFetched = Date.now();
      this.#save();
      // Also save to separate storage for easy access
      window.localStorage.setItem(
        "admin_user_roles",
        JSON.stringify({
          roles,
          timestamp: Date.now(),
        }),
      );
    }
  }

  getRoles(): UserRoleInfo[] | null {
    // First try to get from session
    if (this.#session?.roles) {
      return this.#session.roles;
    }

    // Fallback to localStorage
    const cached = window.localStorage.getItem("admin_user_roles");
    if (cached) {
      try {
        const data = JSON.parse(cached);
        return data.roles || null;
      } catch {
        return null;
      }
    }

    return null;
  }

  areRolesStale(maxAgeMs: number = 5 * 60 * 1000): boolean {
    if (!this.#session?.rolesLastFetched) {
      return true;
    }
    return Date.now() - this.#session.rolesLastFetched > maxAgeMs;
  }

  clearRoles() {
    if (this.#session) {
      this.#session.roles = undefined;
      this.#session.rolesLastFetched = undefined;
      this.#save();
    }
    window.localStorage.removeItem("admin_user_roles");
  }

  #save() {
    if (this.#session) {
      window.localStorage.setItem(
        "admin_session",
        JSON.stringify(this.#session),
      );
    } else {
      window.localStorage.removeItem("admin_session");
    }
    this.notifyChange();
  }
}

export const LoginState = new LoginStore();
