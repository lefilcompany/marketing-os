import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/deepersona/coleta")({
  component: () => <Navigate to="/deepersona" replace />,
});
