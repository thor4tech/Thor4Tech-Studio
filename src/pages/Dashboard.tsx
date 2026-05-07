import { useState, useEffect, useMemo, memo } from "react";
import { collection, query, getDocs, onSnapshot, orderBy, limit, doc, updateDoc, writeBatch, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { formatDistanceToNow, format, isPast, isWithinInterval, addDays, getMonth, isSameMonth, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link, useNavigate } from "react-router-dom";
import PageTransition from "../components/PageTransition";
import { motion, AnimatePresence } from "motion/react";
import { LayoutGrid, List, Activity, Clock, AlertCircle, ArrowUpRight, ArrowDownRight, Video, CheckCircle2, MessageSquare, Plus, Search, User, Briefcase, PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../lib/auth";
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors, DragStartEvent, DragEndEvent, DragOverEvent } from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import CommandPalette from "../components/CommandPalette";

// CONSTANTS
const COLUMNS = [
  { id: 'raw_received', label: 'BRUTOS', color: 'bg-bg-surface-elevated text-text-tertiary border-border-default', dot: 'bg-text-tertiary' },
  { id: 'briefing_ready', label: 'BRIEFING', color: 'bg-info-subtle text-info border-info/20', dot: 'bg-info' },
  { id: 'in_editing', label: 'EDIÇÃO', color: 'bg-accent-subtle text-accent border-accent/20', dot: 'bg-accent' },
  { id: 'v1_delivered', label: 'V1 PRONTA', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', dot: 'bg-purple-500' },
  { id: 'in_review', label: 'REVISÃO', color: 'bg-warning-subtle text-warning border-warning/20', dot: 'bg-warning' },
  { id: 'approved', label: 'APROVADO', color: 'bg-success-subtle text-success border-success/20', dot: 'bg-success' },
];

// COMPONENT: KanbanCard
const KanbanCard = memo(({ video, appUser, isOverlay = false }: { video: any, appUser: any, isOverlay?: boolean }) => {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: video.id,
    disabled: appUser?.role === 'viewer',
    data: { video }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  const isDelayed = video.deadline && isPast(new Date(video.deadline));
  const isUrgent = video.deadline && !isDelayed && isWithinInterval(new Date(video.deadline), {start: new Date(), end: addDays(new Date(), 3)});

  const handleClick = (e: React.MouseEvent) => {
    if (isDragging) return;
    navigate(`/clients/${video.client_slug}/videos/${video.id}`);
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      onClick={handleClick}
      className={`bg-bg-surface p-4 rounded-lg border ${
        isOverlay ? 'rotate-2 opacity-90 shadow-2xl border-accent' : 
        isDragging ? 'opacity-30' : 
        'border-border-default shadow-sm hover:border-border-strong hover:-translate-y-px hover:shadow-md'
      } transition-all cursor-pointer group`}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-bg-surface-elevated to-bg-surface-active flex items-center justify-center text-[10px] font-bold text-text-primary shadow-sm border border-border-default">
            {video.client_slug?.charAt(0).toUpperCase() || 'C'}
          </div>
          <span className="text-xs font-semibold text-text-secondary group-hover:text-text-primary transition-colors">{video.client_slug || 'Cliente'}</span>
        </div>
        {video.platform === 'YOUTUBE' ? (
          <span className="text-[9px] px-1.5 py-0.5 bg-[#FF0000]/10 text-[#FF0000] border border-[#FF0000]/20 rounded uppercase tracking-wider font-bold">YT</span>
        ) : (
          <span className="text-[9px] px-1.5 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded uppercase tracking-wider font-bold">REELS</span>
        )}
      </div>
      <h4 className="font-medium text-sm text-text-primary leading-snug mb-4 line-clamp-2">
        {video.title}
      </h4>
      <div className="flex items-center justify-between mt-auto">
        <div className="flex items-center gap-2">
          {video.editor_id ? (
            <div className="w-6 h-6 rounded-full bg-bg-surface-active border border-border-default flex items-center justify-center text-[10px] font-bold text-text-secondary" title="Editor atribuído">E</div>
          ) : (
            <div className="w-6 h-6 rounded-full border border-dashed border-border-strong flex items-center justify-center text-text-tertiary text-[10px]" title="Sem editor">?</div>
          )}
          {video.comments_count > 0 && (
            <div className="flex items-center gap-1 text-text-tertiary">
              <MessageSquare className="w-3.5 h-3.5" />
               <span className="text-[10px] font-medium">{video.comments_count}</span>
            </div>
          )}
        </div>
        <span className={`text-[10px] font-mono px-2 py-1 rounded flex items-center gap-1.5 ${
          isDelayed ? 'bg-danger-subtle text-danger font-bold' : 
          isUrgent ? 'bg-warning-subtle text-warning font-semibold' : 
          'text-text-tertiary bg-bg-surface-elevated'
        }`}>
          <Clock className="w-3 h-3" />
          {video.deadline ? format(new Date(video.deadline), 'dd MMM', {locale: ptBR}) : '--'}
        </span>
      </div>
    </div>
  );
});

// COMPONENT: KanbanColumn
const KanbanColumnComponent = ({ column, children }: { column: any, children: React.ReactNode }) => {
  const { isOver, setNodeRef } = useDroppable({ id: column.id });
  
  return (
    <div 
      ref={setNodeRef}
      className={`w-[320px] flex flex-col max-h-full rounded-xl transition-colors duration-200 ${
        isOver ? 'bg-accent-subtle/20 ring-2 ring-accent/30' : 'bg-transparent'
      }`}
    >
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${column.dot}`}></div>
          <h3 className="text-[11px] font-bold text-text-primary tracking-wider uppercase">{column.label}</h3>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar px-2 pb-4">
        {children}
      </div>
    </div>
  );
};

// COMPONENT: Sparkline
const Sparkline = ({ color, data }: { color: string, data: any[] }) => (
  <div className="w-20 h-8 opacity-70">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  </div>
);


export default function Dashboard() {
  const [videos, setVideos] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [editorsCap, setEditorsCap] = useState({ used: 0, total: 0, users: [] as any[]});
  
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [activeDragVideo, setActiveDragVideo] = useState<any>(null);
  
  const { user, appUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // 1. Fetch active videos
    const qVideos = query(collection(db, "videos"), orderBy("created_at", "desc"));
    const unsubVideos = onSnapshot(qVideos, (snapshot) => {
      const v = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      setVideos(v.filter((vid: any) => vid.status !== 'posted' && vid.status !== 'archived'));
    });

    // 2. Fetch clients to check for empty state
    const qClients = query(collection(db, "clients"), limit(2));
    const unsubClients = onSnapshot(qClients, (snapshot) => {
      setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 3. Fetch recent activity (pipeline_logs)
    const qLogs = query(collection(db, "pipeline_logs"), orderBy("created_at", "desc"), limit(10));
    const unsubLogs = onSnapshot(qLogs, (snapshot) => {
      setActivity(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 4. Fetch capacity
    const qEditors = query(collection(db, "users"), limit(20));
    const unsubEditors = onSnapshot(qEditors, (snapshot) => {
      const ed = snapshot.docs.map(d => d.data()).filter(u => u.role === 'editor' && u.active);
      const totalCap = ed.reduce((acc, curr) => acc + (curr.capacity_videos_per_week || 5), 0);
      setEditorsCap({ used: 0, total: totalCap, users: ed }); // real 'used' will be calculated later
    });

    Promise.all([
      new Promise(r => setTimeout(r, 600)) // ensure minimum loading time for skeletons
    ]).then(() => setLoading(false));

    return () => {
      unsubVideos();
      unsubClients();
      unsubLogs();
      unsubEditors();
    };
  }, []);

  // Set real capacity usage
  useEffect(() => {
    if (videos.length > 0 && editorsCap.users.length > 0) {
      const usedByEditors = videos.filter(v => v.editor_id).length;
      setEditorsCap(prev => ({...prev, used: usedByEditors}));
    }
  }, [videos, editorsCap.users]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveDragVideo(active.data.current?.video || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragVideo(null);
    if (appUser?.role === 'viewer') return;
    
    const { active, over } = event;
    if (!over) return;
    
    const videoId = active.id as string;
    const newStatus = over.id as string;
    const videoData = active.data.current?.video;
    
    if (videoData && videoData.status !== newStatus) {
      try {
        const batch = writeBatch(db);
        const videoRef = doc(db, "videos", videoId);
        batch.update(videoRef, {
          status: newStatus,
          updated_at: serverTimestamp()
        });

        // Create log pipeline
        const logRef = doc(collection(db, "pipeline_logs"));
        batch.set(logRef, {
          video_id: videoId,
          video_title: videoData.title,
          user_name: appUser?.name || 'Sistema',
          user_id: user?.uid || '',
          action: 'moveu para',
          to_status: newStatus,
          created_at: serverTimestamp()
        });

        await batch.commit();
        const statusLabel = COLUMNS.find(c => c.id === newStatus)?.label || newStatus;
        toast.success(`Vídeo movido para ${statusLabel}`);
        
        // Webhook (simulado, deixaremos anotado)
        // fetch('https://n8n.your-webhook-url.com/webhook/pipeline-update', { method: 'POST', body: JSON.stringify({ videoId, status: newStatus }) });
      } catch (err) {
        console.error("Failed to update status", err);
        toast.error("Erro ao mover vídeo");
      }
    }
  };

  if (loading) {
     return (
        <div className="p-8 max-w-[1400px] mx-auto space-y-8 w-full">
           <div className="h-20 w-1/3 bg-bg-surface-elevated animate-pulse rounded-lg"></div>
           <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[1,2,3,4].map(i => <div key={i} className="h-32 bg-bg-surface border border-border-default rounded-lg animate-pulse"></div>)}
           </div>
           <div className="flex gap-6 h-[500px]">
              <div className="flex-1 bg-bg-surface border border-border-default rounded-lg animate-pulse"></div>
              <div className="w-80 bg-bg-surface border border-border-default rounded-lg animate-pulse"></div>
           </div>
        </div>
     );
  }

  // EMPTY STATE: Novo Usuário (Sem clientes)
  if (clients.length === 0) {
    return (
      <PageTransition className="flex-1 flex flex-col items-center justify-center p-8 bg-bg-base relative overflow-hidden">
        {/* Orbs */}
        <div className="absolute top-1/4 -right-20 w-[400px] h-[400px] bg-accent/20 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute -bottom-20 -left-20 w-[300px] h-[300px] bg-warning/10 rounded-full blur-[80px] pointer-events-none"></div>
        
        <div className="text-center space-y-6 max-w-md relative z-10">
          <div className="w-24 h-24 bg-bg-surface-elevated border border-border-default rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-8">
            <PlusCircle className="w-10 h-10 text-accent" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-text-primary">Vamos começar?</h2>
          <p className="text-base text-text-secondary leading-relaxed">
            Cadastre seu primeiro cliente para organizar a produção, configurar prazos e começar o pipeline de vídeos.
          </p>
          <div className="pt-4">
             <Link to="/clients?new=true" className="inline-flex items-center justify-center h-12 px-8 rounded-md bg-accent hover:bg-accent-hover text-white font-semibold transition-all shadow-[0_4px_14px_rgba(242,101,34,0.3)]">
               Adicionar Cliente
             </Link>
          </div>
        </div>
      </PageTransition>
    );
  }

  // Derived Data
  const delayed = videos.filter(v => v.deadline && isPast(new Date(v.deadline)));
  const upcoming = videos.filter(v => v.deadline && isWithinInterval(new Date(v.deadline), { start: new Date(), end: addDays(new Date(), 7) }));
  const sortedUpcoming = [...upcoming].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
  const capPercent = editorsCap.total > 0 ? Math.min(Math.round((editorsCap.used / editorsCap.total) * 100), 100) : 0;

  return (
    <PageTransition className="p-8 flex flex-col gap-8 max-w-[1500px] mx-auto h-[100vh] w-full overflow-hidden">
      <CommandPalette />
      
      {/* HEADER */}
      <header className="flex justify-between items-end shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary mb-1">
            Bem-vindo, {appUser?.name.split(' ')[0]}
          </h1>
          <p className="text-sm text-text-secondary">Aqui está o panorama da operação hoje.</p>
        </div>
        <div className="hidden sm:block">
           <p className="font-mono text-sm text-text-tertiary bg-bg-surface-elevated px-3 py-1.5 rounded-md border border-border-default capitalize">
             {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
           </p>
        </div>
      </header>

      {/* METRIC CARDS */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 shrink-0">
        {/* EM PRODUÇÃO */}
        <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} transition={{delay: 0.1}} 
          onClick={() => setViewMode('kanban')}
          className="bg-bg-surface p-5 rounded-xl border border-border-default hover:border-border-strong hover:-translate-y-1 hover:shadow-lg transition-all relative overflow-hidden group cursor-pointer"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-accent"></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <p className="text-text-secondary text-[11px] font-bold uppercase tracking-[0.1em]">Em Produção</p>
            <Activity className="w-4 h-4 text-accent/50 group-hover:text-accent transition-colors" />
          </div>
          <div className="flex items-end justify-between relative z-10">
            <div>
              <span className="text-4xl font-extrabold tracking-tight text-text-primary leader-none">{videos.length}</span>
              <p className="text-[10px] text-text-tertiary mt-1 font-medium">+2 vs semana passada</p>
            </div>
            <Sparkline color="var(--accent)" data={[{value: 5}, {value: 8}, {value: 6}, {value: 10}, {value: videos.length}]} />
          </div>
        </motion.div>

        {/* ATRASADOS */}
        <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} transition={{delay: 0.15}} 
          className="bg-bg-surface p-5 rounded-xl border border-border-default hover:border-border-strong hover:-translate-y-1 hover:shadow-lg transition-all relative overflow-hidden group cursor-pointer"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-danger"></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <p className="text-text-secondary text-[11px] font-bold uppercase tracking-[0.1em]">Atrasados</p>
            <AlertCircle className={`w-4 h-4 transition-colors ${delayed.length > 0 ? 'text-danger animate-pulse' : 'text-danger/50'}`} />
          </div>
          <div className="flex items-end justify-between relative z-10">
            <div>
              <div className="flex items-center gap-3">
                 <span className="text-4xl font-extrabold tracking-tight text-text-primary leader-none">{delayed.length}</span>
                 {delayed.length > 0 && <span className="text-[10px] uppercase font-bold text-danger bg-danger-subtle px-2 py-0.5 rounded tracking-wider">Urgente</span>}
              </div>
              <p className="text-[10px] text-text-tertiary mt-1 font-medium">Requer atenção</p>
            </div>
            <Sparkline color="var(--danger)" data={[{value: 2}, {value: 4}, {value: 1}, {value: 3}, {value: delayed.length}]} />
          </div>
        </motion.div>

        {/* PRÓXIMOS 7 DIAS */}
        <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} transition={{delay: 0.2}} 
          className="bg-bg-surface p-5 rounded-xl border border-border-default hover:border-border-strong hover:-translate-y-1 hover:shadow-lg transition-all relative overflow-hidden group"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-warning"></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <p className="text-text-secondary text-[11px] font-bold uppercase tracking-[0.1em]">Próx 7 Dias</p>
            <Clock className="w-4 h-4 text-warning/50 group-hover:text-warning transition-colors" />
          </div>
          <div className="flex items-end justify-between relative z-10">
            <div>
              <span className="text-4xl font-extrabold tracking-tight text-text-primary leader-none">{upcoming.length}</span>
              <p className="text-[10px] text-text-tertiary mt-1 font-medium">{upcoming.filter(v => isWithinInterval(new Date(v.deadline), {start: new Date(), end: addDays(new Date(), 3)})).length} dessa semana</p>
            </div>
            <Sparkline color="var(--warning)" data={[{value: 3}, {value: 4}, {value: 6}, {value: 5}, {value: upcoming.length}]} />
          </div>
        </motion.div>

        {/* CAPACIDADE */}
        <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} transition={{delay: 0.25}} 
          onClick={() => navigate('/editors')}
          className="bg-bg-surface p-5 rounded-xl border border-border-default hover:border-border-strong hover:-translate-y-1 hover:shadow-lg transition-all relative overflow-hidden group cursor-pointer flex flex-col justify-between"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-info"></div>
          <div className="flex justify-between items-start mb-2 relative z-10">
            <p className="text-text-secondary text-[11px] font-bold uppercase tracking-[0.1em]">Capacidade</p>
            <User className="w-4 h-4 text-info/50 group-hover:text-info transition-colors" />
          </div>
          <div className="relative z-10 w-full mt-auto">
             <div className="flex items-baseline gap-2 mb-2">
                <span className="text-2xl font-bold text-text-primary">{capPercent}%</span>
                <span className="text-[10px] text-text-tertiary font-medium uppercase tracking-wider">Ocupado</span>
             </div>
             <div className="w-full h-1.5 bg-bg-surface-elevated rounded-full overflow-hidden mb-2">
                 <div className={`h-full rounded-full ${capPercent > 90 ? 'bg-danger' : capPercent > 70 ? 'bg-warning' : 'bg-info'}`} style={{ width: `${capPercent}%` }}></div>
             </div>
             <p className="text-[10px] text-text-tertiary font-medium truncate">
                {editorsCap.users.slice(0,2).map(u => `${u.name.split(' ')[0]}: ${videos.filter(v=>v.editor_id===u.id).length}/${u.capacity_videos_per_week || 5}`).join(' · ')}
             </p>
          </div>
        </motion.div>
      </section>

      {/* EMPTY STATE - Sem vídeos */}
      {videos.length === 0 && clients.length > 0 && (
         <div className="flex-1 flex flex-col items-center justify-center p-8 bg-bg-surface/50 border-2 border-dashed border-border-default rounded-2xl">
            <LayoutGrid className="w-12 h-12 text-text-tertiary mb-4 opacity-50" />
            <h3 className="text-xl font-bold text-text-primary mb-2">Nenhum vídeo em andamento</h3>
            <p className="text-sm text-text-secondary mb-6">Que tal adicionar o primeiro vídeo no pipeline?</p>
            <Link to="/upload" className="h-10 px-6 flex items-center bg-accent hover:bg-accent-hover text-white font-semibold rounded-md shadow-sm">
               Adicionar Primeiro Vídeo
            </Link>
         </div>
      )}

      {/* TWO COLUMNS LAYOUT: Kanban/List + Side Panels */}
      {videos.length > 0 && (
        <div className="flex flex-1 gap-6 min-h-0 overflow-hidden">
          {/* MAIN AREA */}
          <div className="flex-1 flex flex-col min-w-0 bg-bg-surface border border-border-default rounded-xl shadow-sm overflow-hidden">
            {/* Kanban Header */}
            <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between shrink-0 bg-bg-surface z-10 w-full relative">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                  Pipeline Ativo
                </h2>
                <span className="text-[10px] bg-bg-base text-text-secondary px-2 py-0.5 rounded font-mono border border-border-subtle">{videos.length} videos</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex bg-bg-base rounded-md p-1 border border-border-default">
                  <button 
                    onClick={() => setViewMode('kanban')}
                    className={`px-3 py-1.5 rounded text-[11px] uppercase tracking-wider font-bold transition-all ${viewMode === 'kanban' ? 'bg-bg-surface shadow-[0_2px_4px_rgba(0,0,0,0.2)] text-text-primary' : 'text-text-tertiary hover:text-text-secondary'}`}
                  >
                    Kanban
                  </button>
                  <button 
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-1.5 rounded text-[11px] uppercase tracking-wider font-bold transition-all ${viewMode === 'list' ? 'bg-bg-surface shadow-[0_2px_4px_rgba(0,0,0,0.2)] text-text-primary' : 'text-text-tertiary hover:text-text-secondary'}`}
                  >
                    Lista
                  </button>
                </div>
                <button className="h-9 px-3 flex items-center gap-2 bg-bg-base hover:bg-bg-surface-elevated border border-border-default text-text-secondary font-medium rounded-md text-xs transition-all">
                  Filtros <ArrowDownRight className="w-3 h-3" />
                </button>
                <Link to="/upload" className="h-9 px-4 flex items-center gap-2 bg-accent hover:bg-accent-hover text-white font-semibold rounded-md text-xs transition-all shadow-[0_2px_8px_rgba(242,101,34,0.3)] shrink-0">
                  <Plus className="w-4 h-4" /> Novo Vídeo
                </Link>
              </div>
            </div>

            {/* KANBAN VIEW */}
            {viewMode === 'kanban' && (
              <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar bg-bg-base/30 relative flex">
                <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                  <div className="flex min-w-max gap-4 p-5 h-full relative">
                    {COLUMNS.map((column) => {
                      const columnVideos = videos.filter(v => v.status === column.id);
                      return (
                        <KanbanColumnComponent key={column.id} column={column}>
                          <AnimatePresence>
                            {columnVideos.map((video) => (
                              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} key={video.id}>
                                <KanbanCard video={video} appUser={appUser} />
                              </motion.div>
                            ))}
                          </AnimatePresence>
                          {columnVideos.length === 0 && (
                            <div className="h-20 border border-dashed border-border-default bg-bg-surface/30 rounded-lg flex items-center justify-center">
                              <span className="text-[11px] text-text-tertiary font-medium">Nenhum vídeo</span>
                            </div>
                          )}
                        </KanbanColumnComponent>
                      );
                    })}
                  </div>
                  
                  {/* Drag Overlay */}
                  <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
                    {activeDragVideo ? (
                      <KanbanCard video={activeDragVideo} appUser={appUser} isOverlay />
                    ) : null}
                  </DragOverlay>
                </DndContext>
              </div>
            )}

            {/* LIST VIEW (Omitted for brevity - placeholder) */}
            {viewMode === 'list' && (
              <div className="flex-1 overflow-y-auto custom-scrollbar bg-bg-base/20 p-6">
                <div className="text-center text-text-tertiary py-10 text-sm">Vista em lista (implementação futura)</div>
              </div>
            )}
          </div>

          {/* SIDE PANELS Area (1/3 width, usually ~320px-380px) */}
          <div className="w-[340px] flex flex-col gap-6 shrink-0 h-full pb-4">
            
            {/* Próximas Deadlines */}
            <div className="bg-bg-surface border border-border-default rounded-xl shadow-sm flex flex-col flex-none">
              <div className="px-5 py-3.5 border-b border-border-subtle flex items-center justify-between">
                <h3 className="text-[11px] font-bold text-text-primary uppercase tracking-widest flex items-center gap-2">
                  Próximas Deadlines
                </h3>
              </div>
              <div className="p-2 flex flex-col gap-1 max-h-[220px] overflow-y-auto custom-scrollbar">
                {sortedUpcoming.slice(0, 5).map((v, i) => {
                  const daysToDeadline = differenceInDays(new Date(v.deadline), new Date());
                  let timeStr = "";
                  let colorClass = "text-text-secondary";
                  if (daysToDeadline < 0) { timeStr = "Atrasado"; colorClass = "text-danger"; }
                  else if (daysToDeadline === 0) { timeStr = "Hoje"; colorClass = "text-danger"; }
                  else if (daysToDeadline === 1) { timeStr = "Amanhã"; colorClass = "text-warning"; }
                  else { timeStr = `Em ${daysToDeadline} dias`; colorClass = "text-text-secondary"; }

                  return (
                    <Link to={`/clients/${v.client_slug}/videos/${v.id}`} key={i} className="flex flex-col gap-1.5 p-3 hover:bg-bg-surface-elevated rounded-lg transition-colors cursor-pointer group border border-transparent hover:border-border-default">
                      <div className="flex justify-between items-start gap-2">
                        <span className={`text-[11px] font-bold uppercase tracking-wider ${colorClass}`}>{timeStr}</span>
                        <span className="text-[10px] text-text-tertiary font-mono">{format(new Date(v.deadline), 'dd MMM', {locale: ptBR})}</span>
                      </div>
                      <p className="text-[13px] text-text-primary font-medium line-clamp-1 group-hover:text-accent transition-colors">{v.title}</p>
                      <p className="text-[10px] text-text-tertiary uppercase tracking-wider">{v.client_slug}</p>
                    </Link>
                  )
                })}
                {sortedUpcoming.length === 0 && (
                  <div className="p-6 text-center text-[11px] text-text-tertiary uppercase tracking-widest font-semibold">Tudo tranquilo</div>
                )}
              </div>
            </div>

            {/* Atividade Recente */}
            <div className="bg-bg-surface border border-border-default rounded-xl shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border-subtle flex items-center justify-between shrink-0">
                <h3 className="text-[11px] font-bold text-text-primary uppercase tracking-widest flex items-center gap-2">
                  Atividade Recente
                </h3>
              </div>
              <div className="p-5 flex-1 overflow-y-auto custom-scrollbar relative">
                <div className="absolute left-[29px] top-6 bottom-6 w-px bg-border-default/50 z-0"></div>
                <div className="flex flex-col gap-6 relative z-10">
                  {activity.length > 0 ? activity.map((log) => {
                     // Determinar cores do evento baseado na ação/status
                     let dotColor = "bg-text-tertiary";
                     if (log.action.includes('entregou') || log.to_status === 'v1_delivered') dotColor = "bg-purple-500";
                     if (log.action.includes('aprovou') || log.to_status === 'approved') dotColor = "bg-success";
                     if (log.action.includes('revisão') || log.to_status === 'in_review') dotColor = "bg-warning";
                     if (log.to_status === 'in_editing') dotColor = "bg-accent";

                     return (
                        <div key={log.id} className="flex gap-4 group">
                           <div className="w-6 h-6 rounded-full bg-bg-surface border-2 border-border-default flex items-center justify-center shrink-0 mt-0.5 shadow-sm group-hover:border-border-strong transition-colors relative z-10">
                             <div className={`w-2 h-2 rounded-full ${dotColor}`}></div>
                           </div>
                           <div className="flex flex-col gap-1.5">
                             <p className="text-[13px] text-text-primary leading-snug">
                               <span className="font-bold text-text-primary">{log.user_name?.split(' ')[0]}</span>{' '}
                               <span className="text-text-secondary">{log.action}</span>{' '}
                               <span className="font-medium text-accent hover:underline cursor-pointer">{log.video_title}</span>
                             </p>
                             <span className="text-[10px] font-medium text-text-tertiary font-mono">
                               {log.created_at ? formatDistanceToNow(log.created_at.toDate(), { addSuffix: true, locale: ptBR }) : 'agora'}
                             </span>
                           </div>
                        </div>
                     )
                  }) : (
                    <div className="text-center text-[11px] text-text-tertiary uppercase tracking-widest font-semibold py-10 bg-bg-surface z-20 relative">Nenhuma atividade recente</div>
                  )}
                </div>
              </div>
              <div className="px-5 py-3 border-t border-border-subtle bg-bg-base/30 text-center shrink-0">
                 <button className="text-[11px] font-bold text-text-tertiary hover:text-text-primary uppercase tracking-widest transition-colors">
                    Ver todo histórico
                 </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageTransition>
  );
}
