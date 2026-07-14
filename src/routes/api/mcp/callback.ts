import { createFileRoute } from "@tanstack/react-router";

// OAuth 2.1 callback for MCP providers. Public route: no app session here.
// Trust anchor is mcp_oauth_states (created by startMcpAuth under a signed-in
// session, with a 10-minute expires_at). Row is consumed after use.

const RETURN_TO_ALLOWLIST = /^\/(lekpis|deepersona|soma|creator|estrategia|comunidades|biblioteca|ia)(\/|\?|$)/;

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeReturnTo(input: string | null | undefined, provider: string): string {
  const fallback = `/${provider || ""}` || "/";
  if (!input || typeof input !== "string") return fallback;
  if (!input.startsWith("/") || input.startsWith("//")) return fallback;
  return RETURN_TO_ALLOWLIST.test(input) ? input : fallback;
}

function appendResult(pathAndQuery: string, key: string, value: string): string {
  const sep = pathAndQuery.includes("?") ? "&" : "?";
  return `${pathAndQuery}${sep}${key}=${encodeURIComponent(value)}`;
}

function pageHtml(status: number, body: string): Response {
  return new Response(
    `<!doctype html><meta charset="utf-8"><title>MCP</title>
<style>body{font-family:system-ui;padding:32px;max-width:520px;margin:auto;color:#111}
h1{margin:0 0 8px} .ok{color:#059669}.err{color:#dc2626}
a{color:#2563eb}</style>${body}`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

function errorPage(returnTo: string, title: string, hint?: string): Response {
  const url = appendResult(returnTo, "mcp", "error");
  return pageHtml(
    400,
    `<h1 class="err">${esc(title)}</h1>${
      hint ? `<p>${esc(hint)}</p>` : ""
    }<p><a href="${esc(url)}">Voltar</a></p>
<script>try{if(window.opener){window.opener.postMessage({type:'mcp:error'},'*');window.close();}else{window.location.replace(${JSON.stringify(
      url,
    )});}}catch(e){window.location.replace(${JSON.stringify(url)});}</script>`,
  );
}

export const Route = createFileRoute("/api/mcp/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const requestId = crypto.randomUUID();
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const oauthError = url.searchParams.get("error");

        if (oauthError) {
          console.warn("[mcp.callback] oauth error", { requestId, oauthError });
          return errorPage("/", "Autorização cancelada", "Você pode tentar novamente.");
        }
        if (!code || !state) {
          console.warn("[mcp.callback] missing code/state", { requestId });
          return errorPage("/", "Parâmetros ausentes", "Reinicie a conexão.");
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { getProvider, exchangeCode } = await import("@/lib/mcp.server");
        const { encryptToken, TOKEN_ENCRYPTION_VERSION } = await import(
          "@/lib/mcp-crypto.server"
        );

        const { data: pending, error: stateErr } = await supabaseAdmin
          .from("mcp_oauth_states")
          .select("*")
          .eq("state", state)
          .maybeSingle();
        if (stateErr) {
          console.error("[mcp.callback] state lookup failed", {
            requestId,
            error: stateErr.message,
          });
          return errorPage("/", "Erro ao validar a solicitação.");
        }
        if (!pending) {
          return errorPage("/", "Sessão de autorização inválida.", "Reinicie a conexão.");
        }

        // Expiration check.
        if (pending.expires_at && new Date(pending.expires_at).getTime() < Date.now()) {
          await supabaseAdmin.from("mcp_oauth_states").delete().eq("state", state);
          return errorPage(
            safeReturnTo(pending.return_to, pending.provider),
            "Sessão expirada",
            "Reinicie a conexão.",
          );
        }

        // Consume state to prevent replay.
        await supabaseAdmin.from("mcp_oauth_states").delete().eq("state", state);

        const returnTo = safeReturnTo(pending.return_to, pending.provider);

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
          console.error("[mcp.callback] token exchange failed", {
            requestId,
            provider: pending.provider,
            error: (e as Error).message,
          });
          return errorPage(returnTo, "Falha ao concluir autorização.");
        }

        const provider = getProvider(pending.provider);
        const expiresAt = tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
          : null;

        const accessCipher = await encryptToken(tokens.access_token);
        const refreshCipher = tokens.refresh_token
          ? await encryptToken(tokens.refresh_token)
          : null;

        const conflictKey = pending.workspace_id
          ? "user_id,workspace_id,provider"
          : "user_id,provider";

        const { error: upErr } = await supabaseAdmin.from("mcp_connections").upsert(
          {
            user_id: pending.user_id,
            workspace_id: pending.workspace_id,
            provider: pending.provider,
            authorization_server: provider.authorizationServer,
            resource: provider.resource,
            client_id: pending.client_id,
            access_token: "", // legacy column
            refresh_token: null,
            access_token_ciphertext: accessCipher,
            refresh_token_ciphertext: refreshCipher,
            token_encryption_version: TOKEN_ENCRYPTION_VERSION,
            token_type: tokens.token_type ?? "Bearer",
            expires_at: expiresAt,
            scope: tokens.scope ?? provider.scope,
          },
          { onConflict: conflictKey },
        );
        if (upErr) {
          console.error("[mcp.callback] save failed", {
            requestId,
            provider: pending.provider,
            error: upErr.message,
          });
          return errorPage(returnTo, "Não foi possível salvar a conexão.");
        }

        const successUrl = appendResult(returnTo, "mcp", "connected");
        return pageHtml(
          200,
          `<h1 class="ok">MCP conectado ✓</h1>
<p>${esc(provider.name)} está pronto. Você pode fechar esta aba.</p>
<script>
try { if (window.opener) { window.opener.postMessage({ type: 'mcp:connected', provider: ${JSON.stringify(
            pending.provider,
          )} }, '*'); window.close(); } else { window.location.replace(${JSON.stringify(
            successUrl,
          )}); } } catch (e) { window.location.replace(${JSON.stringify(successUrl)}); }
</script>
<p><a href="${esc(successUrl)}">Voltar</a></p>`,
        );
      },
    },
  },
});
