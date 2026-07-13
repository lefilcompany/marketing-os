import { useState } from "react";
import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Mail, Sparkles, Layers, BarChart3, Users, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Marketing OS" },
      { name: "description", content: "Acesse o Marketing OS da LeFil." },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState<null | "login" | "signup" | "magic" | "google" | "reset">(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading("login");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(null);
    if (error) return toast.error(error.message);
    navigate({ to: "/dashboard" });
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading("signup");
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { full_name: name },
      },
    });
    setLoading(null);
    if (error) return toast.error(error.message);
    toast.success("Conta criada. Você já pode entrar.");
  }

  async function handleMagic() {
    if (!email) return toast.error("Informe seu e-mail primeiro.");
    setLoading("magic");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    });
    setLoading(null);
    if (error) return toast.error(error.message);
    toast.success("Link de acesso enviado. Confira seu e-mail.");
  }

  async function handleGoogle() {
    setLoading("google");
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/dashboard",
    });
    if (result.error) { setLoading(null); return toast.error(String(result.error)); }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  }

  async function handleReset() {
    if (!email) return toast.error("Informe seu e-mail.");
    setLoading("reset");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(null);
    if (error) return toast.error(error.message);
    toast.success("Enviamos um link de recuperação.");
  }

  return (
    <div className="min-h-dvh grid lg:grid-cols-2 bg-background">
      {/* Left — brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 bg-gradient-hero text-primary-foreground overflow-hidden">
        <div className="absolute inset-0 bg-gradient-mesh opacity-60" />
        <div className="relative">
          <div className="flex items-center gap-2 font-display text-xl font-semibold">
            <div className="h-9 w-9 rounded-lg bg-white/15 backdrop-blur flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
            Marketing OS
          </div>
        </div>
        <div className="relative space-y-8 max-w-lg">
          <div>
            <p className="text-sm uppercase tracking-widest text-white/60">LeFil</p>
            <h1 className="mt-3 font-display text-5xl font-semibold leading-tight">
              Seu marketing conectado, organizado e inteligente.
            </h1>
            <p className="mt-4 text-white/70 text-lg">
              Todas as ferramentas da sua operação de marketing em um único lugar.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { icon: Sparkles, label: "Creator", desc: "Conteúdo com IA" },
              { icon: Layers, label: "SoMA", desc: "Operação" },
              { icon: BarChart3, label: "LeKPI", desc: "Performance" },
              { icon: Users, label: "Deepersona", desc: "Audiência" },
            ].map((m) => (
              <div key={m.label} className="rounded-xl border border-white/10 bg-white/5 backdrop-blur px-4 py-3">
                <m.icon className="h-4 w-4 text-white/80 mb-2" />
                <div className="font-semibold">{m.label}</div>
                <div className="text-white/60 text-xs">{m.desc}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative text-white/50 text-xs">
          © {new Date().getFullYear()} LeFil. Todos os direitos reservados.
        </div>
      </div>

      {/* Right — form */}
      <div className="flex flex-col justify-center items-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 font-display text-xl font-semibold text-foreground mb-8">
            <div className="h-9 w-9 rounded-lg bg-gradient-hero flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            Marketing OS
          </div>
          <h2 className="font-display text-2xl font-semibold text-foreground">Bem-vindo de volta</h2>
          <p className="mt-1 text-sm text-muted-foreground">Acesse sua central de marketing.</p>

          <Tabs defaultValue="login" className="mt-8">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Nova conta</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4 mt-6">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Senha</Label>
                    <button type="button" onClick={handleReset} className="text-xs text-muted-foreground hover:text-foreground">
                      Esqueci minha senha
                    </button>
                  </div>
                  <div className="relative">
                    <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" className="pr-10" />
                    <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={!!loading}>
                  {loading === "login" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
                </Button>
              </form>
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">ou continue com</span>
                </div>
              </div>
              <div className="grid gap-2">
                <Button type="button" variant="outline" onClick={handleGoogle} disabled={!!loading}>
                  <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
                  Google
                </Button>
                <Button type="button" variant="outline" onClick={handleMagic} disabled={!!loading}>
                  <Mail className="h-4 w-4" /> Enviar magic link
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4 mt-6">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome completo</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">E-mail</Label>
                  <Input id="signup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Senha</Label>
                  <Input id="signup-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
                  <p className="text-xs text-muted-foreground">Mínimo de 8 caracteres.</p>
                </div>
                <Button type="submit" className="w-full" disabled={!!loading}>
                  {loading === "signup" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar conta"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Novas contas normalmente entram por convite de um administrador. Contas criadas aqui não têm acesso a workspaces até serem convidadas — exceto a primeira, que assume o papel de superadministrador.
                </p>
              </form>
            </TabsContent>
          </Tabs>

          <p className="mt-8 text-xs text-muted-foreground text-center">
            Precisa de ajuda? Fale com o suporte LeFil.
          </p>
        </div>
      </div>
    </div>
  );
}
