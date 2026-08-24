import { type ReactNode, useEffect, useState } from "react";

interface ClientOnlyContentProps {
  children: ReactNode;
  minHeight?: number;
}

export function ClientOnlyContent({ children, minHeight = 720 }: ClientOnlyContentProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) {
    return <div aria-hidden="true" style={{ minHeight }} />;
  }

  return <>{children}</>;
}
