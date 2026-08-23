import React, { createContext, useContext, useState, useEffect } from "react";
import api from "@/lib/axios";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState(null);

  // Check current session on app startup via HttpOnly Cookie (GET /api/auth/me)
  const checkAuthStatus = async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/api/auth/me");
      if (response.data && response.data.success && response.data.user) {
        setUser(response.data.user);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (err) {
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Login handler
  const login = async (identifier, password) => {
    setError(null);
    setIsLoading(true);
    try {
      const response = await api.post("/api/auth/login", {
        identifier,
        password
      });

      if (response.data && response.data.success && response.data.user) {
        const loggedInUser = response.data.user;
        setUser(loggedInUser);
        setIsAuthenticated(true);
        return loggedInUser;
      } else {
        throw new Error(response.data?.message || "Login failed");
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Invalid credentials";
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Register handler
  const register = async (registerData) => {
    setError(null);
    setIsLoading(true);
    try {
      const response = await api.post("/api/auth/register", registerData);

      if (response.data && response.data.success && response.data.user) {
        const registeredUser = response.data.user;
        setUser(registeredUser);
        setIsAuthenticated(true);
        return registeredUser;
      } else {
        throw new Error(response.data?.message || "Registration failed");
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Registration failed";
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Logout handler
  const logout = async () => {
    setIsLoading(true);
    try {
      await api.post("/api/auth/logout");
    } catch (err) {
      console.warn("Logout request completed with warning:", err.message);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        isInitialized,
        error,
        setError,
        login,
        register,
        logout,
        checkAuthStatus
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
