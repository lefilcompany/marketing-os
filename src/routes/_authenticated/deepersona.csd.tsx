import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/deepersona/csd")({
  component: () => <Navigate to="/deepersona" replace />,
});
