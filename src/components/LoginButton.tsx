import { useAuth } from "../context/AuthContext";
import { Button } from "./Button";
import { useNavigate } from "react-router-dom";

export function LoginButton() {
  const { isAuthenticated, pubkey, logout } = useAuth();
  const navigate = useNavigate();

  if (!isAuthenticated) {
    return (
      <Button variant="primary" onClick={() => navigate("/login")}>
        Sign In
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-gray-400">
        {pubkey ? `${pubkey.slice(0, 8)}...${pubkey.slice(-8)}` : "Admin"}
      </span>
      <Button
        variant="secondary"
        onClick={() => {
          logout();
          navigate("/login");
        }}
      >
        Sign Out
      </Button>
    </div>
  );
}
