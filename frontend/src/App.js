import { useState, useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { SettingsProvider } from "@/context/SettingsContext";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import Archive from "@/pages/Archive";
import AdminPanel from "@/pages/AdminPanel";
import EmbedChat from "@/pages/EmbedChat";
import Background from "@/pages/Background";

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const savedToken = localStorage.getItem("token");
      if (savedToken) {
        try {
          const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
          const response = await fetch(`${API}/auth/me`, {
            headers: { Authorization: `Bearer ${savedToken}` }
          });
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
            setToken(savedToken);
          } else {
            localStorage.removeItem("token");
            setToken(null);
          }
        } catch (e) {
          localStorage.removeItem("token");
          setToken(null);
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const handleLogin = (newToken, userData) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    if (token) {
      try {
        const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
        const response = await fetch(`${API}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        }
      } catch (e) {
        console.error("Error refreshing user:", e);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <div className="text-gold font-cinzel text-xl animate-pulse">Caricamento...</div>
      </div>
    );
  }

  return (
    <SettingsProvider>
      <div className="App min-h-screen bg-void">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={!token ? <Landing /> : <Navigate to="/dashboard" />} />
            <Route path="/login" element={!token ? <Login onLogin={handleLogin} /> : <Navigate to="/dashboard" />} />
            <Route path="/register" element={!token ? <Register onLogin={handleLogin} /> : <Navigate to="/dashboard" />} />
            <Route path="/dashboard" element={token ? <Dashboard user={user} token={token} onLogout={handleLogout} refreshUser={refreshUser} /> : <Navigate to="/login" />} />
            <Route path="/archive" element={token ? <Archive user={user} token={token} onLogout={handleLogout} /> : <Navigate to="/login" />} />
            <Route path="/background" element={token ? <Background user={user} token={token} onLogout={handleLogout} /> : <Navigate to="/login" />} />
            <Route path="/admin" element={token && user?.role === "admin" ? <AdminPanel user={user} token={token} onLogout={handleLogout} /> : <Navigate to="/dashboard" />} />
            <Route path="/embed" element={<EmbedChat />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" richColors />
      </div>
    </SettingsProvider>
  );
}

export default App;
