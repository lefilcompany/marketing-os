import { useClienteList } from "@/hooks/use-lekpis-queries";
import { useClienteAtivo } from "@/contexts/cliente-ativo-context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ClienteSelector({ className }: { className?: string }) {
  const { data } = useClienteList();
  const { clienteId, setClienteId } = useClienteAtivo();
  const items = data?.items ?? [];

  return (
    <Select value={clienteId ?? undefined} onValueChange={setClienteId}>
      <SelectTrigger className={className ?? "h-9 w-[220px] text-sm"}>
        <SelectValue placeholder="Selecionar cliente…" />
      </SelectTrigger>
      <SelectContent>
        {items.length === 0 && (
          <div className="px-3 py-2 text-xs text-muted-foreground">
            Nenhum cliente disponível
          </div>
        )}
        {items.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.nome ?? c.id}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
