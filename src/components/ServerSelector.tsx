import { useState, useEffect } from "react";
import { SimpleModal } from "./SimpleModal";
import { Button } from "./Button";
import { Cog6ToothIcon } from "@heroicons/react/24/outline";

interface ServerConfig {
  name: string;
  url: string;
}

const DEFAULT_SERVERS: ServerConfig[] = [
  { name: "Localhost", url: "http://localhost:3000" },
  { name: "Development", url: "https://dev-api.lnvps.com" },
  { name: "Production", url: "https://api.lnvps.net" },
];

const STORAGE_KEY = "lnvps_admin_server_config";

export function ServerSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const [servers, setServers] = useState<ServerConfig[]>(DEFAULT_SERVERS);
  const [currentServer, setCurrentServer] = useState<string>("");
  const [customUrl, setCustomUrl] = useState("");

  useEffect(() => {
    // Load saved configuration
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const config = JSON.parse(saved);
        if (config.servers) setServers(config.servers);
        if (config.currentServer) setCurrentServer(config.currentServer);
      } catch (e) {
        console.warn("Failed to load server config:", e);
      }
    }

    // If no current server set, use current origin
    if (!currentServer) {
      setCurrentServer(window.location.origin);
    }
  }, [currentServer]);

  const saveConfig = (newServers: ServerConfig[], newCurrentServer: string) => {
    const config = {
      servers: newServers,
      currentServer: newCurrentServer,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    setServers(newServers);
    setCurrentServer(newCurrentServer);

    // Reload the page to apply new API URL
    window.location.reload();
  };

  const handleServerSelect = (url: string) => {
    saveConfig(servers, url);
  };

  const handleAddCustomServer = () => {
    if (!customUrl.trim()) return;

    let url = customUrl.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

    const name = new URL(url).hostname;
    const newServers = [...servers, { name, url }];
    saveConfig(newServers, url);
    setCustomUrl("");
  };

  const handleRemoveServer = (index: number) => {
    const newServers = servers.filter((_, i) => i !== index);
    const serverToRemove = servers[index];
    const newCurrentServer =
      currentServer === serverToRemove.url
        ? window.location.origin
        : currentServer;
    saveConfig(newServers, newCurrentServer);
  };

  const getCurrentServerName = () => {
    const server = servers.find((s) => s.url === currentServer);
    return server
      ? server.name
      : new URL(currentServer || window.location.origin).hostname;
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex w-full items-center rounded-lg px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
        title="Switch API Server"
      >
        <Cog6ToothIcon className="mr-3 h-5 w-5" />
        <span>{getCurrentServerName()}</span>
      </button>

      <SimpleModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="API Server Configuration"
        footer={
          <Button variant="secondary" onClick={() => setIsOpen(false)}>
            Close
          </Button>
        }
      >
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-white mb-2">
              Current Server
            </h4>
            <div className="text-sm text-green-400 font-mono bg-slate-800 px-3 py-2 rounded">
              {currentServer || window.location.origin}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-white mb-2">
              Available Servers
            </h4>
            <div className="space-y-2">
              {servers.map((server, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-slate-800 px-3 py-2 rounded"
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white">
                      {server.name}
                    </div>
                    <div className="text-xs text-gray-400 font-mono">
                      {server.url}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={
                        currentServer === server.url ? "primary" : "secondary"
                      }
                      onClick={() => handleServerSelect(server.url)}
                      disabled={currentServer === server.url}
                    >
                      {currentServer === server.url ? "Current" : "Select"}
                    </Button>
                    {index >= DEFAULT_SERVERS.length && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleRemoveServer(index)}
                        className="text-red-400 hover:text-red-300"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-white mb-2">
              Add Custom Server
            </h4>
            <div className="flex gap-2">
              <input
                type="text"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://your-api-server.com"
                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white placeholder-gray-400 text-sm"
                onKeyDown={(e) => e.key === "Enter" && handleAddCustomServer()}
              />
              <Button
                size="sm"
                variant="primary"
                onClick={handleAddCustomServer}
                disabled={!customUrl.trim()}
              >
                Add
              </Button>
            </div>
          </div>

          <div className="text-xs text-gray-400 bg-slate-800 p-3 rounded">
            <strong>Note:</strong> Changing the server will reload the page.
            Make sure the target server has the LNVPS Admin API available and
            CORS configured properly.
          </div>
        </div>
      </SimpleModal>
    </>
  );
}
