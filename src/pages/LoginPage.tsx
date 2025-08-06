import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { LoginState } from "../lib/login";
import { adminApi } from "../lib/api";
import { bech32ToHex } from "@snort/shared";
import { Nip46Signer, Nip7Signer } from "@snort/system";

export function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [keyIn, setKeyIn] = useState("");
  const navigate = useNavigate();

  const fetchAndCacheRoles = async () => {
    try {
      console.log("Fetching user roles after login...");
      const userRoles = await adminApi.getCurrentUserRoles();
      LoginState.setRoles(userRoles);
      console.log("User roles cached successfully:", userRoles.length, "roles");
    } catch (err) {
      console.warn("Failed to fetch user roles after login:", err);
      // Don't block login if role fetch fails - roles will be fetched later
    }
  };

  const handleNostrExtensionLogin = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Try to use NIP-7 signer, which will handle extension detection internally
      const pk = await new Nip7Signer().getPubKey();
      LoginState.login(pk);

      // Fetch and cache user roles after successful login
      await fetchAndCacheRoles();

      navigate("/");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to login with Nostr extension. Please make sure you have a Nostr browser extension installed (like Alby or nos2x).",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyLogin = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (keyIn.startsWith("nsec1")) {
        LoginState.loginPrivateKey(bech32ToHex(keyIn));
        // Fetch and cache user roles after successful login
        await fetchAndCacheRoles();
        navigate("/");
      } else if (keyIn.startsWith("bunker://")) {
        const signer = new Nip46Signer(keyIn);
        await signer.init();
        const pubkey = await signer.getPubKey();
        LoginState.loginBunker(keyIn, signer.privateKey!, pubkey);
        // Fetch and cache user roles after successful login
        await fetchAndCacheRoles();
        navigate("/");
      } else {
        throw new Error(
          "Invalid key format. Please enter a valid nsec key or bunker URL.",
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to login");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-dark-900 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-white">
            LNVPS Admin Dashboard
          </h2>
          <p className="mt-2 text-sm text-dark-400">
            Sign in with your Nostr key
          </p>
        </div>

        <Card className="mt-8">
          {error && (
            <div className="mb-4 rounded-md bg-red-900/50 p-4 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Nostr Extension Login */}
          <div className="mb-6">
            <Button
              variant="primary"
              onClick={handleNostrExtensionLogin}
              isLoading={isLoading}
              className="w-full"
            >
              Connect with Nostr Extension
            </Button>
            <p className="mt-2 text-xs text-center text-gray-400">
              Requires a Nostr browser extension like{" "}
              <a
                href="https://getalby.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-blue-400 hover:text-blue-300"
              >
                Alby
              </a>{" "}
              or{" "}
              <a
                href="https://nos2x.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-blue-400 hover:text-blue-300"
              >
                nos2x
              </a>
            </p>
          </div>

          <div className="flex gap-4 items-center my-6">
            <div className="h-[1px] bg-gray-600 w-full"></div>
            <div className="text-sm text-gray-400">OR</div>
            <div className="h-[1px] bg-gray-600 w-full"></div>
          </div>

          {/* Manual Key Entry */}
          <div className="space-y-4">
            <div>
              <label
                htmlFor="key"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Enter your Nostr key or bunker URL
              </label>
              <input
                id="key"
                type="text"
                placeholder="nsec1... or bunker://..."
                value={keyIn}
                onChange={(e) => setKeyIn(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <Button
              variant="secondary"
              onClick={handleKeyLogin}
              isLoading={isLoading}
              disabled={
                !keyIn.startsWith("nsec") && !keyIn.startsWith("bunker://")
              }
              className="w-full"
            >
              Login with Key
            </Button>
          </div>

          <div className="mt-6 text-center text-sm text-dark-400">
            <p>
              You need admin permissions to access this dashboard.
              <br />
              Please contact system administrator if you need access.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
