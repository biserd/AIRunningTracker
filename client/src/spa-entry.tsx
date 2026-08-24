import { createRoot } from "react-dom/client";
import App from "./App";

export function mountSpa(root: HTMLElement) {
  createRoot(root).render(<App />);
}
