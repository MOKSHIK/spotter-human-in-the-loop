import type { User } from "../types";

type Props = {
  user: User | null;
  email: string;
  password: string;
  onEmailChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onLogin: () => void | Promise<void>;
  onLogout: () => void;
  onGetNextImage: () => void | Promise<void>;
};

export function AuthPanel({
  user,
  email,
  password,
  onEmailChange,
  onPasswordChange,
  onLogin,
  onLogout,
  onGetNextImage,
}: Props) {
  return (
    <div className="card" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      {!user ? (
        <>
          <input value={email} onChange={(e) => onEmailChange(e.target.value)} placeholder="email" />
          <input
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            placeholder="password"
            type="password"
          />
          <button onClick={onLogin}>Login</button>
        </>
      ) : (
        <>
          <div>
            Logged in as <b>{user.email}</b>
            <span
              style={{
                padding: "4px 8px",
                borderRadius: 6,
                backgroundColor: user.role === "Admin" ? "#fef3c7" : "#dbeafe",
                color: "#333",
                fontSize: 12,
                marginLeft: 8,
              }}
            >
              {user.role}
            </span>
          </div>

          {user.role === "Annotator" && <button onClick={onGetNextImage}>Get Next Image</button>}

          <button onClick={onLogout} style={{ background: "#6b7280" }}>
            Logout
          </button>
        </>
      )}
    </div>
  );
}