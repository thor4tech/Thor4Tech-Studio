import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { useNavigate } from "react-router-dom";
import { Search, Video, User, Briefcase, Settings, LogOut } from "lucide-react";
import { db } from "../lib/firebase";
import { collection, query, getDocs, limit } from "firebase/firestore";
import { useAuth } from "../lib/auth";

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [videos, setVideos] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const navigate = useNavigate();
  const { logOut } = useAuth();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    if (open && videos.length === 0) {
      // Fetch some options
      getDocs(query(collection(db, "videos"), limit(10))).then(snap => {
        setVideos(snap.docs.map(d => ({id: d.id, ...d.data()})));
      });
      getDocs(query(collection(db, "clients"), limit(10))).then(snap => {
        setClients(snap.docs.map(d => ({id: d.id, ...d.data()})));
      });
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-[600px] overflow-hidden rounded-xl border border-border-default bg-bg-surface shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-10 scale-100 animate-in fade-in zoom-in-95 duration-200">
        <Command label="Command Palette" className="w-full flex flex-col bg-transparent">
          <div className="flex items-center border-b border-border-default px-4">
            <Search className="w-5 h-5 text-text-tertiary mr-2 shrink-0" />
            <Command.Input 
              autoFocus 
              placeholder="Busque por vídeos, clientes, ações..." 
              className="flex-1 h-12 bg-transparent text-text-primary text-[15px] font-medium placeholder:text-text-tertiary focus:outline-none placeholder:font-normal"
            />
          </div>
          
          <Command.List className="max-h-[300px] overflow-y-auto p-2 custom-scrollbar">
            <Command.Empty className="py-6 text-center text-sm text-text-tertiary">Nenhum resultado encontrado.</Command.Empty>

            <Command.Group heading="Ações" className="text-[10px] font-semibold text-text-tertiary px-2 py-1.5 uppercase tracking-wider">
              <Command.Item 
                onSelect={() => { navigate('/upload'); setOpen(false); }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-text-primary aria-selected:bg-bg-surface-active aria-selected:text-accent cursor-pointer group transition-colors"
              >
                <div className="p-1 rounded bg-accent/10 text-accent group-aria-selected:bg-accent group-aria-selected:text-white transition-colors"><Video className="w-4 h-4" /></div>
                <span>Novo Vídeo</span>
              </Command.Item>
              <Command.Item 
                onSelect={() => { navigate('/clients?new=true'); setOpen(false); }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-text-primary aria-selected:bg-bg-surface-active aria-selected:text-warning cursor-pointer group transition-colors"
              >
                <div className="p-1 rounded bg-warning/10 text-warning group-aria-selected:bg-warning group-aria-selected:text-white transition-colors"><Briefcase className="w-4 h-4" /></div>
                <span>Novo Cliente</span>
              </Command.Item>
            </Command.Group>

            {videos.length > 0 && (
              <Command.Group heading="Vídeos" className="text-[10px] font-semibold text-text-tertiary px-2 py-1.5 mt-2 uppercase tracking-wider">
                {videos.map(v => (
                  <Command.Item 
                    key={v.id} 
                    onSelect={() => { navigate(`/clients/${v.client_slug}/videos/${v.id}`); setOpen(false); }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-text-secondary aria-selected:bg-bg-surface-elevated aria-selected:text-text-primary cursor-pointer transition-colors"
                  >
                    <Video className="w-4 h-4 text-text-tertiary" />
                    <span className="font-medium line-clamp-1">{v.title}</span>
                    <span className="text-[10px] text-text-tertiary ml-auto uppercase tracking-wider">{v.client_slug}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {clients.length > 0 && (
              <Command.Group heading="Clientes" className="text-[10px] font-semibold text-text-tertiary px-2 py-1.5 mt-2 uppercase tracking-wider">
                {clients.map(c => (
                  <Command.Item 
                    key={c.id} 
                    onSelect={() => { navigate(`/clients/${c.slug}`); setOpen(false); }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-text-secondary aria-selected:bg-bg-surface-elevated aria-selected:text-text-primary cursor-pointer transition-colors"
                  >
                    <Briefcase className="w-4 h-4 text-text-tertiary" />
                    <span className="font-medium">{c.name}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            <Command.Group heading="Sistema" className="text-[10px] font-semibold text-text-tertiary px-2 py-1.5 mt-2 uppercase tracking-wider">
              <Command.Item 
                onSelect={() => { logOut(); setOpen(false); }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-text-secondary aria-selected:bg-danger-subtle aria-selected:text-danger cursor-pointer transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sair</span>
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
