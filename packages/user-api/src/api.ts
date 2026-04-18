import type { User } from "./types";

type Listener = () => void;

let currentUser: User | null = null;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((l) => l());
}

export const userApi = {
  getUser(): User | null {
    return currentUser ? { ...currentUser } : null;
  },

  setUser(user: User): void {
    currentUser = { ...user };
    notify();
  },

  logout(): void {
    currentUser = null;
    notify();
  },

  isAuthenticated(): boolean {
    return currentUser !== null;
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
