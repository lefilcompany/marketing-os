import { createFileRoute } from "@tanstack/react-router";

// OAuth 2.1 callback for MCP providers. Public route (/api/*) — do not require
// the app session here: the browser arrives from an external authorization
// server. The mcp_oauth_states row (created by startMcpAuth under a signed-in
// session) is the trust anchor; we look it up server-side and delete it after
// use so a code can't be replayed.

function html(status: number, body: string): Response {
  return new Response(
    `<!doctype html><meta charset="utf-8"><title>MCP</title>
<style>body{font-family:system-ui;padding:32px;max-width:520px;margin:auto;color:#111}
h1{margin:0 0 8px} .ok{color:#059669}.err{color:#dc2626}
a{color:#2563eb}</style>${body}`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

export const Route = createFileRoute("/api/mcp/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const oauthError = url.searchParams.get("error");
        const errorDescription = url.searchParams.get("error_description");

        if (oauthError) {
          return html(
            400,
            `<h1 class="err">Falha na autorização</h1><p>${oauthError}${
              errorDescription ? ` — ${errorDescription}` : ""
            }</p><p><a href="/deepersona">Voltar</a></p>`,
          );
        }
        if (!code || !state) {
          return html(400, `<h1 class="err">Parâmetros ausentes</h1><p>code/state.</p>`);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { getProvider, exchangeCode } = await import("@/lib/mcp.server");

        const { data: pending, error: stateErr } = await supabaseAdmin
          .from("mcp_oauth_states")
          .select("*")
          .eq("state", state)
          .maybeSingle();
        if (stateErr) return html(500, `<h1 class="err">Erro</h1><p>${stateErr.message}</p>`);
        if (!pending)
          return html(400, `<h1 class="err">State inválido</h1><p>Reinicie a conexão.</p>`);

        // Consume state to prevent replay.
        await supabaseAdmin.from("mcp_oauth_states").delete().eq("state", state);

        let tokens;
        try {
          const provider = getProvider(pending.provider);
          tokens = await exchangeCode(
            provider,
            pending.client_id,
            code,
            pending.code_verifier,
            pending.redirect_uri,
          );
        } catch (e) {
          return html(
            502,
            `<h1 class="err">Falha na troca de token</h1><pre>${
              (e as Error).message
            }</pre><p><a href="/deepersona">Voltar</a></p>`,
          );
        }

        const provider = getProvider(pending.provider);
        const expiresAt = tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
          : null;

        const { error: upErr } = await supabaseAdmin.from("mcp_connections").upsert(
          {
            user_id: pending.user_id,
            provider: pending.provider,
            authorization_server: provider.authorizationServer,
            resource: provider.resource,
            client_id: pending.client_id,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token ?? null,
            token_type: tokens.token_type ?? "Bearer",
            expires_at: expiresAt,
            scope: tokens.scope ?? provider.scope,
          },
          { onConflict: "user_id,provider" },
        );
        if (upErr) return html(500, `<h1 class="err">Erro ao salvar</h1><p>${upErr.message}</p>`);

        const returnTo = pending.return_to || `/${pending.provider}`;
        return html(
          200,
          `<h1 class="ok">MCP conectado ✓</h1>
<p>${provider.name} está pronto. Você pode fechar esta aba.</p>
<script>
try { if (window.opener) { window.opener.postMessage({ type: 'mcp:connected', provider: '${pending.provider}' }, '*'); window.close(); } else { window.location.replace(${JSON.stringify(returnTo)}); } } catch (e) { window.location.replace(${JSON.stringify(returnTo)}); }
</script>
<p><a href="${returnTo}">Voltar</a></p>`,
        );
      },
    },
  },
});
