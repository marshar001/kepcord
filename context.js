import { createContext, useContext } from "react";

// Who is signed in. Every screen reads it with useMe().
export const UserContext = createContext(null);
export const useMe = () => useContext(UserContext);
