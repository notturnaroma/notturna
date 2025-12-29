import { createContext, useContext, useState, useEffect } from "react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const defaultSettings = {
  event_name: "L'Archivio Maledetto",
  event_logo_url: null,
  primary_color: "#8a0000",
  secondary_color: "#000033",
  accent_color: "#b8860b",
  background_color: "#050505",
  hero_title: "Svela i Segreti",
  hero_subtitle: "dell'Antico Sapere",
  hero_description: "Benvenuto nell'Archivio Maledetto. Qui potrai porre le tue domande e ricevere risposte dai custodi del sapere arcano.",
  chat_placeholder: "Poni la tua domanda all'Oracolo...",
  oracle_name: "L'Oracolo",
  background_image_url: null
};

const SettingsContext = createContext(defaultSettings);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`${API}/settings`);
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        // Apply CSS variables
        applyTheme(data);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyTheme = (data) => {
    const root = document.documentElement;
    root.style.setProperty("--theme-primary", data.primary_color);
    root.style.setProperty("--theme-secondary", data.secondary_color);
    root.style.setProperty("--theme-accent", data.accent_color);
    root.style.setProperty("--theme-background", data.background_color);
  };

  const updateSettings = async (newSettings, token) => {
    try {
      const response = await fetch(`${API}/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newSettings)
      });
      if (response.ok) {
        setSettings(newSettings);
        applyTheme(newSettings);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error updating settings:", error);
      return false;
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, loading, updateSettings, refreshSettings: fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
