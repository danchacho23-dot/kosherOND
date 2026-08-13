"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";
import { copy } from "@/lib/copy";

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[public] error de render", error);
  }, [error]);

  return (
    <div className="container-page py-16">
      <EmptyState
        title={copy.states.errorTitle}
        body={copy.states.errorBody}
        action={<Button onClick={reset}>{copy.states.retry}</Button>}
      />
    </div>
  );
}
