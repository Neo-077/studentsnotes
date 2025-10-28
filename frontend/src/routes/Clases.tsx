import { useEffect, useState } from "react";
import GroupCard from "../components/grupos/GroupCard";
import api from "../lib/api";

type GrupoCard = {
  id_grupo: number;
  grupo_codigo: string;
  materia?: { nombre: string };
  docente?: { nombre: string; ap_paterno: string | null };
  total_estudiantes?: number;
  color_hex?: string;
};

export default function Clases() {
  const [data, setData] = useState<GrupoCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      try {
        // soporte de conteos: ?with_counts=1 (ver backend abajo)
        const grupos = await api.get("/grupos?with_counts=1");
        setData(grupos || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = data.filter((g) => {
    const txt = `${g.materia?.nombre ?? ""} ${g.grupo_codigo}`.toLowerCase();
    return txt.includes(q.toLowerCase());
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-800">Mis grupos</h1>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar grupo..."
          className="h-10 w-64 rounded-xl border px-3 text-sm"
        />
      </div>

      {loading ? (
        <div className="text-slate-500">Cargando…</div>
      ) : filtered.length === 0 ? (
        <div className="text-slate-500">Sin grupos.</div>
      ) : (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((g) => <GroupCard key={g.id_grupo} grupo={g} />)}
        </div>
      )}
    </div>
  );
}
