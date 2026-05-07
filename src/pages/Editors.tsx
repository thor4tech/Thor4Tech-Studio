import { useState, useEffect } from "react";
import { collection, query, onSnapshot, where, addDoc, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/auth";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from "../components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { MoreHorizontal, Plus, Video as VideoIcon, CheckCircle2, Clock, Play, User as UserIcon, Settings, Archive } from "lucide-react";
import PageTransition from "../components/PageTransition";
import { motion, AnimatePresence } from "motion/react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../components/ui/dropdown-menu";

function calculateHeartbeatStatus(lastSeen?: any) {
  if (!lastSeen) return "offline";
  const diffMinutes = (Date.now() - (lastSeen.toMillis ? lastSeen.toMillis() : lastSeen)) / 1000 / 60;
  if (diffMinutes < 2) return "online";
  if (diffMinutes < 15) return "busy";
  return "offline";
}

export default function Editors() {
  const { appUser } = useAuth();
  const [editors, setEditors] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedEditor, setSelectedEditor] = useState<any>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isAddEditorOpen, setIsAddEditorOpen] = useState(false);
  const [isAssignVideoOpen, setIsAssignVideoOpen] = useState(false);
  
  // Add Editor Form
  const [newEditorForm, setNewEditorForm] = useState({ name: '', email: '', capacity: 5, msg: '' });

  useEffect(() => {
    // Real-time subscriptions
    const unsubEditors = onSnapshot(query(collection(db, "users"), where("role", "==", "editor")), (snap) => {
      setEditors(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    const unsubVideos = onSnapshot(collection(db, "videos"), (snap) => {
      setVideos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubEditors(); unsubVideos(); };
  }, []);

  const handleAddEditor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEditorForm.email || !newEditorForm.name) return;
    try {
      await addDoc(collection(db, "users"), {
        name: newEditorForm.name,
        email: newEditorForm.email,
        role: 'editor',
        active: false,
        capacity_videos_per_week: newEditorForm.capacity,
        created_at: serverTimestamp()
      });
      toast.success(`Convite enviado para ${newEditorForm.email}`);
      setIsAddEditorOpen(false);
      setNewEditorForm({ name: '', email: '', capacity: 5, msg: '' });
    } catch(err) {
      toast.error("Erro ao adicionar editor");
    }
  };

  const handleAssignVideo = async (videoId: string, targetEditor: any) => {
    try {
      if (targetEditor.paused) {
        toast.error("Editor está pausado e não pode receber novos vídeos.");
        return;
      }
      
      const activeCount = videos.filter(v => v.editor_id === targetEditor.id && ['in_editing', 'v1_delivered', 'in_review'].includes(v.status)).length;
      const capacity = targetEditor.capacity_videos_per_week || 5;
      
      if (activeCount / capacity > 0.9) {
        if (!window.confirm(`${targetEditor.name} está em 90%+ da capacidade. Tem certeza?`)) return;
      }

      await updateDoc(doc(db, "videos", videoId), {
        editor_id: targetEditor.id,
        status: 'in_editing',
        updated_at: serverTimestamp()
      });
      
      await addDoc(collection(db, "pipeline_logs"), {
        video_id: videoId,
        user_name: appUser?.name,
        user_id: appUser?.id,
        action: 'atribuiu a',
        to_status: 'in_editing',
        created_at: serverTimestamp(),
        note: `Atribuído para ${targetEditor.name}`
      });

      toast.success("Vídeo atribuído com sucesso!");
      setIsAssignVideoOpen(false);
    } catch(err) {
      toast.error("Erro ao atribuir vídeo");
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-bg-base text-text-tertiary">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin mb-4" />
        <span className="text-sm">Carregando editores...</span>
      </div>
    );
  }

  const unassignedVideos = videos.filter(v => !v.editor_id && ['briefing_ready', 'raw_received'].includes(v.status));

  return (
    <PageTransition className="flex-1 overflow-y-auto px-6 py-8 bg-bg-base">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-subtle pb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">Equipe de Edição</h1>
            <p className="text-sm text-text-secondary mt-1">Gerencie capacidade e atribuições</p>
          </div>
          <Button onClick={() => setIsAddEditorOpen(true)} className="bg-accent hover:bg-accent-hover text-white shadow-md">
            <Plus className="w-4 h-4 mr-2" /> Adicionar Editor
          </Button>
        </div>

        {/* LIST */}
        {editors.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center border border-dashed border-border-strong rounded-xl bg-bg-surface/50 text-center px-4">
            <UserIcon className="w-12 h-12 text-text-tertiary opacity-30 mb-4" />
            <h3 className="text-lg font-bold text-text-primary mb-1">Nenhum editor cadastrado</h3>
            <p className="text-sm text-text-secondary mb-6">Adicione editores pra começar a atribuir vídeos</p>
            <Button onClick={() => setIsAddEditorOpen(true)} className="bg-bg-surface-elevated text-text-primary border border-border-default hover:bg-bg-surface-active">
              Adicionar Editor
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <AnimatePresence>
              {editors.map(editor => {
                const isPaused = editor.paused === true;
                const activeVideos = videos.filter(v => v.editor_id === editor.id && ['in_editing', 'v1_delivered', 'in_review'].includes(v.status));
                const capacity = editor.capacity_videos_per_week || 5;
                const activeCount = activeVideos.length;
                const usagePercent = Math.min((activeCount / capacity) * 100, 100);
                
                let barColor = 'bg-success';
                if (usagePercent > 90) barColor = 'bg-danger';
                else if (usagePercent >= 60) barColor = 'bg-warning';

                const statusVal = calculateHeartbeatStatus(editor.lastSignInTime || editor.last_seen);
                let dotColor = "bg-border-strong";
                if (statusVal === 'online') dotColor = 'bg-success shadow-[0_0_8px_rgba(34,197,94,0.6)]';
                else if (statusVal === 'busy') dotColor = 'bg-warning';

                return (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={editor.id}
                    className={`bg-bg-surface border border-border-default rounded-lg p-5 flex flex-col xl:flex-row gap-6 cursor-pointer hover:border-border-strong hover:shadow-sm transition-all focus-within:ring-2 focus-within:ring-accent/50 ${isPaused ? 'opacity-60' : ''}`}
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest('button')) return;
                      setSelectedEditor(editor);
                      setIsSheetOpen(true);
                    }}
                  >
                    {/* Identity - Left */}
                    <div className="flex items-start gap-4 xl:w-[220px] shrink-0">
                      <div className="relative">
                        <div className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-white text-xl bg-gradient-to-br from-bg-surface-elevated to-bg-surface-active border border-border-subtle shadow-inner" style={{ backgroundColor: '#2C2D31' }}>
                          {editor.name.charAt(0).toUpperCase()}
                        </div>
                        <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-bg-surface ${dotColor}`} title={`Status: ${statusVal}`} />
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <h3 className="text-lg font-semibold text-text-primary leading-tight truncate flex items-center gap-2">
                          {editor.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="outline" className="text-[9px] uppercase font-bold tracking-widest bg-bg-surface-elevated border-border-default text-text-secondary">
                            Editor
                          </Badge>
                          {!editor.active && (
                            <Badge variant="outline" className="text-[9px] uppercase font-bold tracking-widest bg-warning-subtle/50 border-warning text-warning">
                              Pendente
                            </Badge>
                          )}
                          {isPaused && (
                            <Badge variant="outline" className="text-[9px] uppercase font-bold tracking-widest bg-bg-surface-elevated border-border-default text-text-tertiary">
                              Pausado
                            </Badge>
                          )}
                        </div>
                        <span className="text-[11px] text-text-tertiary font-mono truncate mt-1.5">{editor.email}</span>
                      </div>
                    </div>

                    {/* Capacity - Center */}
                    <div className="flex-1 flex flex-col justify-center min-w-[280px]">
                      <div className="mb-4">
                        <div className="flex items-end justify-between mb-2">
                          <span className="text-xs text-text-secondary uppercase font-bold tracking-wider">Capacidade desta semana:</span>
                          <span className="font-mono text-xl font-bold text-text-primary">{activeCount}/{capacity}</span>
                        </div>
                        <div className="h-2 w-full bg-bg-surface-active rounded-full overflow-hidden">
                          <div className={`h-full ${barColor} transition-all duration-500`} style={{ width: `${usagePercent}%` }} />
                        </div>
                        <div className="mt-1.5 text-[11px] text-text-tertiary">
                          {usagePercent >= 100 ? "Capacidade máxima atingida" : `Pode assumir mais ${Math.max(0, capacity - activeCount)} vídeos`}
                        </div>
                      </div>

                      {/* Stats Row */}
                      <div className="grid grid-cols-3 gap-2 py-2 border-t border-border-subtle text-[11px]">
                        <div className="flex flex-col">
                          <span className="text-text-tertiary uppercase font-bold tracking-wider mb-0.5">Tempo médio</span>
                          <span className="text-text-primary font-mono">{editor.stats?.avg_time || 'N/A'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-text-tertiary uppercase font-bold tracking-wider mb-0.5">Taxa de revisão</span>
                          <span className="text-text-primary font-mono">{editor.stats?.revision_rate || 'N/A'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-text-tertiary uppercase font-bold tracking-wider mb-0.5">Entregues</span>
                          <span className="text-text-primary font-mono">{editor.stats?.total_delivered || 0}</span>
                        </div>
                      </div>
                    </div>

                    {/* Next Videos - Right */}
                    <div className="xl:w-[260px] shrink-0 border-t xl:border-t-0 xl:border-l border-border-subtle pt-4 xl:pt-0 xl:pl-6 flex flex-col">
                      <span className="text-[10px] text-text-secondary uppercase font-bold tracking-widest mb-3 flex items-center justify-between">
                        Próximos vídeos
                        <DropdownMenu>
                          <DropdownMenuTrigger className="h-6 w-6 p-0 text-text-tertiary hover:text-text-primary rounded hover:bg-bg-surface-active transition-colors flex items-center justify-center outline-none border border-transparent hover:border-border-subtle">
                            <MoreHorizontal className="w-4 h-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 bg-bg-surface-elevated border-border-default">
                             <DropdownMenuItem onClick={() => { setSelectedEditor(editor); setIsSheetOpen(true); }} className="text-xs focus:bg-bg-surface-active text-text-secondary focus:text-text-primary cursor-pointer"><UserIcon className="w-4 h-4 mr-2"/> Ver perfil completo</DropdownMenuItem>
                             <DropdownMenuItem onClick={() => { setSelectedEditor(editor); setIsAssignVideoOpen(true); }} disabled={isPaused} className="text-xs focus:bg-bg-surface-active text-text-secondary focus:text-text-primary cursor-pointer"><Plus className="w-4 h-4 mr-2"/> Atribuir vídeo</DropdownMenuItem>
                             <DropdownMenuItem onClick={async () => { 
                               try {
                                 await updateDoc(doc(db, "users", editor.id), { paused: !isPaused });
                                 toast.success(isPaused ? "Editor ativado" : "Editor pausado");
                               } catch(e) { toast.error("Erro ao atualizar status"); }
                             }} className="text-xs focus:bg-bg-surface-active text-text-secondary focus:text-text-primary cursor-pointer">{isPaused ? <Play className="w-4 h-4 mr-2"/> : <Clock className="w-4 h-4 mr-2"/>} {isPaused ? 'Despausar editor' : 'Pausar (bloquear atribuição)'}</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </span>
                      
                      <div className="flex-1 flex flex-col gap-2">
                        {activeVideos.length === 0 ? (
                          <div className="text-xs text-text-tertiary italic">Nenhum vídeo na fila</div>
                        ) : (
                          activeVideos.slice(0, 3).map(v => (
                            <div key={v.id} className="flex items-center gap-2 group/vid cursor-pointer text-text-secondary hover:text-text-primary">
                              <div className="w-10 h-6 shrink-0 bg-bg-surface-active rounded border border-border-subtle overflow-hidden flex items-center justify-center">
                                <VideoIcon className="w-3 h-3 opacity-50" />
                              </div>
                              <div className="flex flex-col min-w-0 flex-1">
                                <span className="text-[11px] font-medium truncate">{v.title}</span>
                                <span className="text-[9px] font-mono opacity-60">em {v.deadline ? differenceInDays(new Date(v.deadline), new Date()) : '?'}d</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      
                      {activeVideos.length > 3 && (
                        <button onClick={() => { setSelectedEditor(editor); setIsSheetOpen(true); }} className="text-[10px] text-accent hover:underline mt-2 text-left">
                          Ver todos ({activeVideos.length}) &rarr;
                        </button>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ADD EDITOR MODAL */}
      <Dialog open={isAddEditorOpen} onOpenChange={setIsAddEditorOpen}>
        <DialogContent className="bg-bg-surface border border-border-default text-text-primary max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Adicionar Editor</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddEditor} className="space-y-4 py-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Nome</label>
              <input required value={newEditorForm.name} onChange={e => setNewEditorForm(p => ({...p, name: e.target.value}))} className="w-full bg-bg-base border border-border-default rounded p-2 text-sm outline-none focus:border-accent" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">E-mail</label>
              <input type="email" required value={newEditorForm.email} onChange={e => setNewEditorForm(p => ({...p, email: e.target.value}))} className="w-full bg-bg-base border border-border-default rounded p-2 text-sm outline-none focus:border-accent" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Capacidade (vídeos/semana)</label>
              <input type="number" min="1" required value={newEditorForm.capacity} onChange={e => setNewEditorForm(p => ({...p, capacity: parseInt(e.target.value)}))} className="w-full bg-bg-base border border-border-default rounded p-2 text-sm outline-none focus:border-accent" />
            </div>
            <DialogFooter className="mt-6 flex gap-2">
               <Button type="button" variant="outline" onClick={() => setIsAddEditorOpen(false)} className="bg-bg-surface border-border-default">Cancelar</Button>
               <Button type="submit" className="bg-accent hover:bg-accent-hover text-white">Enviar convite</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* ASSIGN VIDEO MODAL */}
      <Dialog open={isAssignVideoOpen} onOpenChange={setIsAssignVideoOpen}>
        <DialogContent className="bg-bg-surface border border-border-default text-text-primary max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg flex flex-col">
              <span>Atribuir vídeo para {selectedEditor?.name}</span>
              <span className="text-xs font-normal text-text-secondary mt-1">Selecione um vídeo da fila que ainda não tem editor alocado.</span>
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto custom-scrollbar flex flex-col gap-2 p-1">
             {unassignedVideos.length === 0 ? (
               <div className="text-center py-8 text-sm text-text-secondary">Nenhum vídeo aguardando editor.</div>
             ) : (
               unassignedVideos.map((v) => (
                 <div key={v.id} className="flex items-center justify-between p-3 bg-bg-base rounded-lg border border-border-default hover:border-accent transition-colors">
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm truncate">{v.title}</span>
                      <span className="text-xs text-text-tertiary">Deadline: {v.deadline ? format(new Date(v.deadline), 'dd/MM/yyyy') : 'Sem prazo'}</span>
                    </div>
                    <Button size="sm" onClick={() => handleAssignVideo(v.id, selectedEditor)} className="bg-accent/10 border border-accent/20 text-accent hover:bg-accent hover:text-white shrink-0">
                      Atribuir
                    </Button>
                 </div>
               ))
             )}
          </div>
        </DialogContent>
      </Dialog>

      {/* LATERAL SHEET */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="right" className="w-[480px] sm:max-w-[100vw] bg-bg-surface border-l border-border-default p-0 flex flex-col gap-0 shadow-2xl">
           {selectedEditor && (
             <>
               <SheetHeader className="p-6 border-b border-border-subtle bg-bg-surface-elevated flex flex-row items-start justify-between">
                 <div className="flex gap-4">
                    <div className="w-20 h-20 rounded-full flex items-center justify-center font-bold text-white text-3xl bg-gradient-to-br from-bg-surface-elevated to-bg-surface-active border border-border-subtle shadow-inner shrink-0" style={{ backgroundColor: '#2C2D31' }}>
                       {selectedEditor.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col pt-1">
                       <SheetTitle className="text-xl font-bold flex items-center gap-2">
                         {selectedEditor.name} 
                       </SheetTitle>
                       <span className="text-xs font-mono text-text-secondary mt-1">{selectedEditor.email}</span>
                       <div className="flex flex-wrap gap-2 mt-3">
                         <Badge variant="outline" className="text-[9px] uppercase font-bold tracking-widest bg-bg-base border-border-default text-text-secondary">Editor</Badge>
                         <Badge variant="outline" className="text-[9px] uppercase font-bold tracking-widest bg-info-subtle/30 border-info/30 text-info">Cortes Rápidos</Badge>
                       </div>
                    </div>
                 </div>
               </SheetHeader>
               
               <div className="flex-1 overflow-hidden flex flex-col w-full h-full">
                 <Tabs defaultValue="current" className="flex-1 flex flex-col min-h-0">
                    <div className="px-6 border-b border-border-subtle bg-bg-surface shrink-0">
                      <TabsList className="bg-transparent justify-start h-12 p-0 w-full gap-4">
                        <TabsTrigger value="current" className="text-xs font-bold uppercase tracking-widest text-text-secondary data-[state=active]:text-accent data-[state=active]:bg-transparent data-[state=active]:border-b-2 border-accent rounded-none px-1 border-transparent outline-none">Atribuições</TabsTrigger>
                        <TabsTrigger value="history" className="text-xs font-bold uppercase tracking-widest text-text-secondary data-[state=active]:text-accent data-[state=active]:bg-transparent data-[state=active]:border-b-2 border-accent rounded-none px-1 border-transparent outline-none">Histórico</TabsTrigger>
                        <TabsTrigger value="perf" className="text-xs font-bold uppercase tracking-widest text-text-secondary data-[state=active]:text-accent data-[state=active]:bg-transparent data-[state=active]:border-b-2 border-accent rounded-none px-1 border-transparent outline-none">Performace</TabsTrigger>
                        <TabsTrigger value="config" className="text-xs font-bold uppercase tracking-widest text-text-secondary data-[state=active]:text-accent data-[state=active]:bg-transparent data-[state=active]:border-b-2 border-accent rounded-none px-1 border-transparent outline-none">Config</TabsTrigger>
                      </TabsList>
                    </div>

                    <div className="flex-1 overflow-y-auto bg-bg-base custom-scrollbar p-6">
                      <TabsContent value="current" className="mt-0 outline-none space-y-4">
                         <div className="flex justify-between items-center mb-4">
                           <span className="text-sm font-bold">Trabalhos em andamento</span>
                           <Button size="sm" onClick={() => setIsAssignVideoOpen(true)} className="h-7 text-xs bg-accent/10 text-accent hover:bg-accent hover:text-white border border-accent/20">
                             <Plus className="w-3 h-3 mr-1" /> Atribuir
                           </Button>
                         </div>
                         {videos.filter(v => v.editor_id === selectedEditor.id && ['in_editing', 'v1_delivered', 'in_review'].includes(v.status)).map(v => (
                            <div key={v.id} className="bg-bg-surface border border-border-default rounded-lg p-3 hover:border-accent transition-colors cursor-pointer">
                               <div className="flex gap-3">
                                  <div className="w-16 h-10 bg-bg-surface-active rounded flex items-center justify-center shrink-0">
                                     <VideoIcon className="w-4 h-4 text-text-tertiary" />
                                  </div>
                                  <div className="flex flex-col flex-1 min-w-0">
                                     <span className="text-sm font-semibold truncate text-text-primary">{v.title}</span>
                                     <div className="flex items-center justify-between mt-1">
                                        <span className="text-[10px] text-text-tertiary uppercase font-bold bg-bg-surface-elevated px-1.5 py-0.5 rounded border border-border-default">{v.status}</span>
                                        <span className="text-[10px] font-mono opacity-80">{v.deadline ? format(new Date(v.deadline), 'dd/MM') : '?'}</span>
                                     </div>
                                  </div>
                               </div>
                            </div>
                         ))}
                      </TabsContent>

                      <TabsContent value="history" className="mt-0 outline-none space-y-4">
                         {videos.filter(v => v.editor_id === selectedEditor.id && ['approved', 'posted', 'archived'].includes(v.status)).length === 0 ? (
                           <div className="text-center text-text-tertiary py-8 text-sm"><Archive className="w-8 h-8 opacity-20 mx-auto mb-2"/>Nenhum vídeo finalizado.</div>
                         ) : (
                           videos.filter(v => v.editor_id === selectedEditor.id && ['approved', 'posted', 'archived'].includes(v.status)).slice(0, 10).map(v => (
                            <div key={v.id} className="bg-bg-surface border border-border-default rounded-lg p-3 flex gap-3 opacity-80">
                               <div className="flex flex-col flex-1 min-w-0">
                                  <span className="text-sm font-medium truncate text-text-primary">{v.title}</span>
                                  <span className="text-[10px] font-mono text-text-tertiary mt-0.5">Finalizado em {v.updated_at ? format(new Date(v.updated_at.toDate()), 'dd/MM/yyyy') : '?'}</span>
                               </div>
                            </div>
                         ))
                         )}
                      </TabsContent>
                      
                      <TabsContent value="perf" className="mt-0 outline-none flex flex-col items-center justify-center py-12 text-text-tertiary">
                        <Clock className="w-12 h-12 opacity-20 mb-4" />
                        <span className="text-sm">Gráficos de performance estarão disponíveis em breve.</span>
                      </TabsContent>
                      
                      <TabsContent value="config" className="mt-0 outline-none space-y-6">
                        <div className="space-y-2 text-sm">
                           <label className="font-bold text-xs uppercase tracking-wider text-text-secondary">Capacidade (vídeos/semana)</label>
                           <input type="number" defaultValue={selectedEditor.capacity_videos_per_week} className="w-full bg-bg-surface border border-border-default rounded p-2 text-text-primary focus:border-accent outline-none"/>
                        </div>
                        <div className="space-y-2 text-sm">
                           <label className="font-bold text-xs uppercase tracking-wider text-text-secondary">Especialidades (vírgula)</label>
                           <input type="text" defaultValue="Cortes Rápidos" className="w-full bg-bg-surface border border-border-default rounded p-2 text-text-primary focus:border-accent outline-none"/>
                        </div>
                        <div className="pt-4 border-t border-border-subtle">
                           <Button variant="outline" className="w-full text-danger border-danger/30 hover:bg-danger/10 hover:border-danger hover:text-danger bg-bg-surface">
                             Remover Editor
                           </Button>
                        </div>
                      </TabsContent>
                    </div>
                 </Tabs>
               </div>
             </>
           )}
        </SheetContent>
      </Sheet>
    </PageTransition>
  );
}

