import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/deepersona")({
  component: () => (
    <div className="deepersona-theme min-h-full">
      <Outlet />
    </div>
  ),
});
