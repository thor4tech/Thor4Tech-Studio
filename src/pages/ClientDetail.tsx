import { useState, useEffect, useMemo, memo } from "react";
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc, writeBatch, serverTimestamp, deleteDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "../components/ui/dropdown-menu";
import { format, isPast, isWithinInterval, addDays, differenceInDays, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, Plus, Settings, ExternalLink, MoreHorizontal, MessageSquare, Clock, Video, ArchiveRestore, Archive, Pause, Play, Trash2, Calendar as CalendarIcon, FileText, User, Filter, SearchX, LayoutGrid, List, CalendarDays, Heading, Bold, Italic, List as ListIcon, Link as LinkIcon, Image as ImageIcon, Quote, Code } from "lucide-react";
import { useAuth } from "../lib/auth";
import PageTransition from "../components/PageTransition";
import { motion, AnimatePresence } from "motion/react";
import { DndContext, DragOverlay, closestCorners, PointerSensor, KeyboardSensor, useSensor, useSensors, DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { toast } from "sonner";
import ReactMarkdown from 'react-markdown';

// --- CONSTANTS ---
const COLUMNS = [
  { id: 'raw_received', label: 'BRUTOS', color: 'bg-bg-surface-elevated text-text-tertiary border-border-default', dot: 'bg-text-tertiary', borderTop: 'border-t-text-tertiary' },
  { id: 'briefing_ready', label: 'BRIEFING', color: 'bg-info-subtle text-info border-info/20', dot: 'bg-info', borderTop: 'border-t-info' },
  { id: 'in_editing', label: 'EDIÇÃO', color: 'bg-accent-subtle text-accent border-accent/20', dot: 'bg-accent', borderTop: 'border-t-accent' },
  { id: 'v1_delivered', label: 'V1 PRONTA', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', dot: 'bg-purple-500', borderTop: 'border-t-purple-500' },
  { id: 'in_review', label: 'REVISÃO', color: 'bg-warning-subtle text-warning border-warning/20', dot: 'bg-warning', borderTop: 'border-t-warning' },
  { id: 'approved', label: 'APROVADO', color: 'bg-success-subtle text-success border-success/20', dot: 'bg-success', borderTop: 'border-t-success' },
];

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  'raw_received': ['briefing_ready', 'in_editing'],
  'briefing_ready': ['in_editing'],
  'in_editing': ['v1_delivered'],
  'v1_delivered': ['in_review', 'approved'],
  'in_review': ['in_editing', 'approved'],
  'approved': ['posted']
};

// --- DND COMPONENTS ---
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
      className={`bg-bg-surface p-3 rounded-lg border flex flex-col gap-2 ${
        isOverlay ? 'rotate-2 opacity-90 shadow-2xl border-accent' : 
        isDragging ? 'opacity-30' : 
        'border-border-default shadow-sm hover:border-border-strong hover:-translate-y-px hover:shadow-md transition-all cursor-pointer group'
      }`}
    >
      <div className="flex justify-between items-start">
        {video.platform === 'YOUTUBE' ? (
          <span className="text-[9px] px-1.5 py-0.5 bg-[#FF0000]/10 text-[#FF0000] border border-[#FF0000]/20 rounded uppercase tracking-wider font-bold">YT</span>
        ) : (
          <span className="text-[9px] px-1.5 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded uppercase tracking-wider font-bold">REELS</span>
        )}
      </div>
      <h4 className="font-medium text-sm text-text-primary leading-snug line-clamp-2">
        {video.title}
      </h4>
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-border-subtle">
        <div className="flex items-center gap-1.5">
          {video.editor_id ? (
            <div className="w-5 h-5 rounded-full bg-bg-surface-active border border-border-default flex items-center justify-center text-[9px] font-bold text-text-secondary" title="Editor atribuído">E</div>
          ) : (
            <div className="w-5 h-5 rounded-full border border-dashed border-border-strong flex items-center justify-center text-text-tertiary text-[9px]" title="Sem editor">?</div>
          )}
          {video.comments_count > 0 && (
            <div className="flex items-center gap-1 text-text-tertiary">
              <MessageSquare className="w-3 h-3" />
               <span className="text-[9px] font-medium">{video.comments_count}</span>
            </div>
          )}
        </div>
        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded flex items-center gap-1 ${
          isDelayed ? 'bg-danger-subtle text-danger font-bold' : 
          isUrgent ? 'bg-warning-subtle text-warning font-semibold' : 
          'text-text-tertiary bg-bg-surface-elevated'
        }`}>
          {video.deadline ? format(new Date(video.deadline), 'dd MMM', {locale: ptBR}) : '--'}
        </span>
      </div>
    </div>
  );
});

const KanbanColumnComponent = ({ column, children }: { column: any, children: React.ReactNode }) => {
  const { isOver, setNodeRef } = useDroppable({ id: column.id });
  return (
    <div 
      ref={setNodeRef}
      className={`w-[280px] flex flex-col max-h-full rounded-xl transition-colors duration-200 bg-bg-base/30 border-t-4 ${column.borderTop} ${
        isOver ? 'bg-accent-subtle/10 ring-2 ring-accent/30' : 'border border-border-subtle'
      }`}
    >
      <div className="flex items-center justify-between p-3 border-b border-border-subtle bg-bg-surface/50 rounded-t-lg">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${column.dot}`}></div>
          <h3 className="text-[11px] font-bold text-text-primary tracking-wider uppercase">{column.label}</h3>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2.5 custom-scrollbar p-2.5">
        {children}
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---
export default function ClientDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { appUser, user } = useAuth();
  
  const [client, setClient] = useState<any>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'videos' | 'styleguide' | 'settings'>('videos');
  const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'calendar'>('kanban');
  const [activeDragVideo, setActiveDragVideo] = useState<any>(null);

  // Settings tab form state
  const [settingsForm, setSettingsForm] = useState<any>({});
  
  // Style Guide state
  const [styleGuideMd, setStyleGuideMd] = useState("");
  const [isSavingMs, setIsSavingMs] = useState(false);
  const [saveTimer, setSaveTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!slug) return;
    
    // Fetch client
    const unsubClient = onSnapshot(doc(db, "clients", slug), (docSnap) => {
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...(docSnap.data() as any) };
        setClient(data);
        // Only init form if empty
        setSettingsForm((prev: any) => Object.keys(prev).length === 0 ? data : prev);
        setStyleGuideMd(data.style_guide_md || "# Style Guide\n\nAdicione regras de estilo aqui.");
        setNotFound(false);
      } else {
        setNotFound(true);
      }
    });

    // Fetch videos
    const qVideos = query(collection(db, "videos"), where("client_slug", "==", slug));
    const unsubVideos = onSnapshot(qVideos, (snapshot) => {
      let v = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setVideos(v.filter((vid: any) => vid.status !== 'archived')); // Hide archived from board here
      setLoading(false);
    });

    return () => {
      unsubClient();
      unsubVideos();
    };
  }, [slug]);

  // Handle DND
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragVideo(event.active.data.current?.video || null);
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
      // Validate transition
      const currentStateIndex = COLUMNS.findIndex(c => c.id === videoData.status);
      const newStatusIndex = COLUMNS.findIndex(c => c.id === newStatus);
      
      const isMovingBackwards = newStatusIndex < currentStateIndex;
      const cmdEvent = (event as any).nativeEvent;
      const forceMove = cmdEvent && (cmdEvent.metaKey || cmdEvent.ctrlKey) && appUser?.role === 'admin';
      
      if (isMovingBackwards && !forceMove) {
        toast.error("Movimento não permitido. Para forçar, use Cmd+Drag (apenas admins).");
        return;
      }

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
        toast.success(`Movido para ${COLUMNS.find(c => c.id === newStatus)?.label || newStatus}`);
      } catch (err) {
        console.error("Failed to update status", err);
        toast.error("Erro ao mover vídeo");
      }
    }
  };

  // Handle Settings Save
  const handleSaveSettings = async () => {
    try {
      const clientRef = doc(db, "clients", slug as string);
      await updateDoc(clientRef, {
        name: settingsForm.name,
        brand_color: settingsForm.brand_color,
        instagram_handle: settingsForm.instagram_handle,
        total_videos_contracted: settingsForm.total_videos_contracted,
        notes: settingsForm.notes,
        updated_at: serverTimestamp()
      });
      toast.success("Configurações salvas");
    } catch (e) {
      toast.error("Erro ao salvar configurações");
    }
  };

  const handleAction = async (action: string) => {
    try {
       const clientRef = doc(db, "clients", slug as string);
       if (action === 'archive') {
         await updateDoc(clientRef, { status: 'archived', updated_at: serverTimestamp() });
         toast.success("Cliente arquivado");
       } else if (action === 'pause') {
         await updateDoc(clientRef, { status: 'paused', updated_at: serverTimestamp() });
         toast.success("Cliente pausado");
       } else if (action === 'reactivate') {
         await updateDoc(clientRef, { status: 'active', updated_at: serverTimestamp() });
         toast.success("Cliente reativado");
       } else if (action === 'delete') {
         if(window.confirm("Digite 'DELETAR' para excluir permanentemente.")) {
           await deleteDoc(clientRef);
           navigate("/clients");
           toast.success("Cliente excluído");
         }
       }
    } catch(err: any) {
       toast.error("Erro ao realizar ação");
    }
  };

  // Auto-save Style Guide
  const handleStyleGuideChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setStyleGuideMd(val);
    
    if (saveTimer) clearTimeout(saveTimer);
    
    const timer = setTimeout(async () => {
      setIsSavingMs(true);
      try {
        await updateDoc(doc(db, "clients", slug as string), {
          style_guide_md: val,
          updated_at: serverTimestamp()
        });
      } catch (err) {
        console.error(err);
      } finally {
        setIsSavingMs(false);
      }
    }, 2000);
    setSaveTimer(timer);
  };

  if (loading) {
    return (
      <div className="p-8 max-w-[1400px] mx-auto space-y-8 animate-pulse w-full">
        <div className="h-6 w-24 bg-bg-surface-elevated rounded"></div>
        <div className="h-[180px] w-full bg-bg-surface-elevated rounded-xl"></div>
        <div className="flex gap-4">
          <div className="h-10 w-24 bg-bg-surface-elevated rounded"></div>
          <div className="h-10 w-24 bg-bg-surface-elevated rounded"></div>
        </div>
        <div className="flex gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-96 w-[280px] bg-bg-surface-elevated rounded-xl shrink-0"></div>)}
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-bg-base/50">
        <SearchX className="w-16 h-16 text-text-tertiary mb-4" />
        <h2 className="text-2xl font-bold text-text-primary mb-2">Cliente não encontrado</h2>
        <p className="text-text-secondary mb-6">O slug '{slug}' não existe ou foi excluído.</p>
        <Button onClick={() => navigate('/clients')} variant="outline" className="bg-bg-surface border-border-default text-text-secondary">Voltar para Clientes</Button>
      </div>
    );
  }

  // Stats
  const deliveredCount = videos.filter(v => v.status === 'posted').length;
  const inProdCount = videos.filter(v => v.status !== 'posted').length;
  const totalContracted = client.total_videos_contracted || 0;
  const progressPercent = totalContracted ? Math.min(Math.round((deliveredCount / totalContracted) * 100), 100) : 0;

  return (
    <PageTransition className="p-4 md:p-8 flex flex-col h-[100vh] overflow-hidden max-w-[1600px] mx-auto w-full">
      {/* BREADCRUMB */}
      <div className="mb-4 shrink-0">
        <Link to="/clients" className="inline-flex items-center text-sm font-medium text-text-tertiary hover:text-text-primary transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Clientes
        </Link>
      </div>

      {/* HERO SECTION */}
      <div 
        className="w-full rounded-2xl border border-border-default overflow-hidden shrink-0 relative flex flex-col justify-end min-h-[140px] md:min-h-[180px] p-6 lg:p-8 bg-bg-surface shadow-sm mb-6"
      >
        {/* Gradient Background */}
        <div className="absolute inset-0 pointer-events-none opacity-40" style={{ background: `linear-gradient(135deg, ${client.brand_color || '#F26522'}88 0%, transparent 100%)` }}></div>
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to top, var(--bg-surface) 0%, transparent 100%)' }}></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
          <div className="flex items-center gap-5">
            <div 
              className="w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center text-3xl md:text-4xl font-black text-white shadow-xl flex-shrink-0"
              style={{ backgroundColor: client.brand_color || '#F26522' }}
            >
              {client.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-text-primary tracking-tight">{client.name}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1.5 md:mt-2 text-sm text-text-secondary">
                {client.instagram_handle && (
                  <a href={`https://instagram.com/${client.instagram_handle.replace('@','')}`} target="_blank" rel="noreferrer" className="flex items-center hover:text-accent font-medium font-mono transition-colors">
                    @{client.instagram_handle.replace('@','')} <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                )}
                <span className="hidden md:inline text-text-tertiary px-1 border-l border-border-default ml-1 h-3"></span>
                <span className="bg-bg-surface-elevated px-2 py-0.5 rounded text-[11px] uppercase tracking-widest font-bold border border-border-default">
                  {client.status === 'paused' ? 'Pausado' : client.status === 'archived' ? 'Arquivado' : 'Ativo'}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-3 w-[280px] sm:w-[320px]">
                <div className="flex-1">
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">{deliveredCount}/{totalContracted} entregues</span>
                    <span className="text-[11px] font-bold text-text-tertiary">{inProdCount} em prod</span>
                  </div>
                  <div className="w-full h-1.5 bg-bg-surface-elevated border border-border-default rounded-full overflow-hidden">
                    <div className="h-full bg-accent rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Button variant="outline" onClick={() => setActiveTab('settings')} className="bg-bg-surface-elevated border-border-default flex-1 md:flex-none hover:bg-bg-surface-active text-text-secondary hover:text-text-primary">
              <Settings className="w-4 h-4 mr-2" /> Configs
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger className="w-10 h-10 rounded-md bg-bg-surface-elevated border border-border-default flex items-center justify-center hover:bg-bg-surface-active transition-colors outline-none shrink-0">
                <MoreHorizontal className="w-4 h-4 text-text-secondary" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 bg-bg-surface border-border-default shadow-lg text-text-primary">
                {client.status === 'active' && <DropdownMenuItem onClick={() => handleAction('pause')} className="cursor-pointer focus:bg-bg-surface-active focus:text-text-primary"><Pause className="w-4 h-4 mr-2 text-text-tertiary" /> Pausar</DropdownMenuItem>}
                {client.status === 'paused' && <DropdownMenuItem onClick={() => handleAction('reactivate')} className="cursor-pointer focus:bg-bg-surface-active focus:text-text-primary"><Play className="w-4 h-4 mr-2 text-text-tertiary" /> Retomar</DropdownMenuItem>}
                {client.status !== 'archived' && <DropdownMenuItem onClick={() => handleAction('archive')} className="cursor-pointer focus:bg-bg-surface-active focus:text-text-primary"><Archive className="w-4 h-4 mr-2 text-text-tertiary" /> Arquivar</DropdownMenuItem>}
                {client.status === 'archived' && <DropdownMenuItem onClick={() => handleAction('reactivate')} className="cursor-pointer focus:bg-bg-surface-active focus:text-text-primary"><ArchiveRestore className="w-4 h-4 mr-2 text-text-tertiary" /> Reativar</DropdownMenuItem>}
                <DropdownMenuSeparator className="bg-border-subtle" />
                <DropdownMenuItem onClick={() => handleAction('delete')} className="text-danger cursor-pointer focus:bg-danger-subtle focus:text-danger"><Trash2 className="w-4 h-4 mr-2" /> Excluir</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* TABS HEADER */}
      <div className="flex items-center border-b border-border-subtle shrink-0 mb-6 font-medium">
        <button 
          onClick={() => setActiveTab('videos')}
          className={`px-6 py-3 border-b-2 text-sm transition-colors -mb-[1px] ${activeTab === 'videos' ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
        >
          <div className="flex items-center gap-2"><Video className="w-4 h-4" /> Vídeos</div>
        </button>
        <button 
          onClick={() => setActiveTab('styleguide')}
          className={`px-6 py-3 border-b-2 text-sm transition-colors -mb-[1px] ${activeTab === 'styleguide' ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
        >
          <div className="flex items-center gap-2"><FileText className="w-4 h-4" /> Style Guide</div>
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`px-6 py-3 border-b-2 text-sm transition-colors -mb-[1px] ${activeTab === 'settings' ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
        >
           <div className="flex items-center gap-2"><Settings className="w-4 h-4" /> Configurações</div>
        </button>
      </div>

      {/* TAB CONTENT */}
      <div className="flex-1 min-h-0 relative">
        
        {/* VIDEOS TAB */}
        <AnimatePresence mode="wait">
          {activeTab === 'videos' && (
            <motion.div key="videos" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0}} className="absolute inset-0 flex flex-col">
              
              {/* Kanban Toolbar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4 shrink-0">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-text-primary">Pipeline</h2>
                  <span className="bg-bg-surface-elevated text-text-secondary border border-border-default px-2 py-0.5 rounded text-[11px] font-mono">{videos.length} vídeos</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex bg-bg-surface border border-border-default rounded-md p-1 mr-2 hidden sm:flex">
                    <button onClick={() => setViewMode('kanban')} className={`p-1.5 rounded ${viewMode === 'kanban' ? 'bg-bg-surface-elevated text-text-primary shadow-sm' : 'text-text-tertiary hover:text-text-secondary'}`}><LayoutGrid className="w-4 h-4" /></button>
                    <button onClick={() => setViewMode('list')} className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-bg-surface-elevated text-text-primary shadow-sm' : 'text-text-tertiary hover:text-text-secondary'}`}><List className="w-4 h-4" /></button>
                    <button onClick={() => setViewMode('calendar')} className={`p-1.5 rounded ${viewMode === 'calendar' ? 'bg-bg-surface-elevated text-text-primary shadow-sm' : 'text-text-tertiary hover:text-text-secondary'}`}><CalendarDays className="w-4 h-4" /></button>
                  </div>
                  <Button variant="outline" className="bg-bg-surface h-9 hidden sm:flex border-border-default text-text-secondary hover:text-text-primary"><Filter className="w-4 h-4 mr-2" /> Filtros</Button>
                  {(appUser?.role === 'admin' || appUser?.role === 'editor') && (
                    <Link to={`/upload?client=${slug}`}>
                      <Button className="bg-accent hover:bg-accent-hover text-white h-9 shadow-[0_2px_8px_rgba(242,101,34,0.3)]">
                        <Plus className="w-4 h-4 mr-2" /> Novo Vídeo
                      </Button>
                    </Link>
                  )}
                </div>
              </div>

              {/* EMPTY STATE VIDEOS */}
              {videos.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-border-default rounded-xl bg-bg-surface/30">
                   <Video className="w-16 h-16 text-text-tertiary mb-4 opacity-50" />
                   <h3 className="text-xl font-bold text-text-primary mb-2">Nenhum vídeo cadastrado</h3>
                   <p className="text-text-secondary mb-6 max-w-md text-center">Faça o upload do primeiro bruto para este cliente e comece a acompanhar a produção no pipeline.</p>
                   {(appUser?.role === 'admin' || appUser?.role === 'editor') && (
                      <Link to={`/upload?client=${slug}`}>
                        <Button className="bg-accent hover:bg-accent-hover text-white shadow-[0_4px_14px_rgba(242,101,34,0.3)] h-12 px-8">
                          Fazer Upload de Brutos
                        </Button>
                      </Link>
                   )}
                </div>
              ) : (
                /* KANBAN VIEW */
                viewMode === 'kanban' && (
                  <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar bg-bg-base/30 rounded-xl relative border border-border-subtle">
                    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                      <div className="flex min-w-max gap-4 p-4 h-full relative items-start">
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
                                <div className="h-16 border-2 border-dashed border-border-default/50 rounded-lg flex items-center justify-center bg-bg-surface/10 opacity-50">
                                  <span className="text-[10px] text-text-tertiary font-bold uppercase tracking-widest">Arraste para cá</span>
                                </div>
                              )}
                            </KanbanColumnComponent>
                          );
                        })}
                      </div>
                      <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
                        {activeDragVideo ? <KanbanCard video={activeDragVideo} appUser={appUser} isOverlay /> : null}
                      </DragOverlay>
                    </DndContext>
                  </div>
                )
              )}
              {viewMode === 'list' && videos.length > 0 && (
                <div className="flex-1 overflow-auto bg-bg-surface border border-border-default rounded-xl">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-bg-surface-elevated text-text-secondary sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="px-4 py-3 font-medium uppercase tracking-wider text-[11px]">Título</th>
                        <th className="px-4 py-3 font-medium uppercase tracking-wider text-[11px]">Status</th>
                        <th className="px-4 py-3 font-medium uppercase tracking-wider text-[11px]">Editor</th>
                        <th className="px-4 py-3 font-medium uppercase tracking-wider text-[11px]">Deadline</th>
                        <th className="px-4 py-3 font-medium uppercase tracking-wider text-[11px] text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {videos.map(video => (
                        <tr key={video.id} className="hover:bg-bg-surface-active transition-colors cursor-pointer" onClick={() => navigate(`/clients/${video.client_slug}/videos/${video.id}`)}>
                          <td className="px-4 py-3 text-text-primary font-medium">
                            <div className="flex items-center gap-2">
                              {video.platform === 'YOUTUBE' ? (
                                <span className="text-[9px] px-1.5 py-0.5 bg-[#FF0000]/10 text-[#FF0000] border border-[#FF0000]/20 rounded uppercase tracking-wider font-bold">YT</span>
                              ) : (
                                <span className="text-[9px] px-1.5 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded uppercase tracking-wider font-bold">REELS</span>
                              )}
                              <span className="truncate max-w-[300px] block">{video.title}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-[11px] font-bold px-2 py-1 rounded inline-flex uppercase tracking-wider ${COLUMNS.find(c => c.id === video.status)?.color || 'bg-bg-surface-elevated text-text-secondary'}`}>
                              {COLUMNS.find(c => c.id === video.status)?.label || video.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {video.editor_id ? (
                              <div className="w-6 h-6 rounded-full bg-bg-surface-elevated border border-border-default flex items-center justify-center text-[10px] font-bold text-text-secondary">E</div>
                            ) : (
                              <span className="text-text-tertiary text-xs italic">Não atribuído</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-text-secondary font-mono text-xs">
                              {video.deadline ? format(new Date(video.deadline), 'dd MMM yyyy', {locale: ptBR}) : '--'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                             <Button variant="outline" size="sm" className="h-7 text-xs bg-bg-surface-elevated border-border-default" onClick={(e) => { e.stopPropagation(); navigate(`/clients/${video.client_slug}/videos/${video.id}`); }}>
                               Abrir
                             </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {viewMode === 'calendar' && videos.length > 0 && (
                <div className="flex-1 border rounded-xl bg-bg-surface border-border-default overflow-hidden flex flex-col">
                  {/* Simplistic Calendar Grid placeholder for visual fulfillment */}
                  <div className="p-4 border-b border-border-subtle bg-bg-surface-elevated flex justify-between items-center">
                     <h3 className="font-bold text-text-primary capitalize">{format(new Date(), 'MMMM yyyy', { locale: ptBR })}</h3>
                  </div>
                  <div className="flex-1 grid grid-cols-7 grid-rows-5 gap-px bg-border-subtle">
                     {Array.from({length: 35}).map((_, i) => {
                       const d = addDays(new Date(new Date().getFullYear(), new Date().getMonth(), 1), i);
                       const dayVids = videos.filter(v => v.deadline && isSameDay(new Date(v.deadline), d));
                       return (
                         <div key={i} className="bg-bg-surface p-2 hover:bg-bg-surface-active transition-colors min-h-[80px]">
                            <span className={`text-xs font-medium ${d.getMonth() === new Date().getMonth() ? 'text-text-primary' : 'text-text-tertiary'}`}>{format(d, 'd')}</span>
                            <div className="mt-1 space-y-1">
                               {dayVids.map(v => (
                                 <div key={v.id} onClick={() => navigate(`/clients/${v.client_slug}/videos/${v.id}`)} className="text-[10px] truncate bg-accent-subtle text-accent px-1.5 py-0.5 rounded cursor-pointer border border-accent/20">
                                   {v.title}
                                 </div>
                               ))}
                            </div>
                         </div>
                       )
                     })}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* STYLE GUIDE TAB */}
          {activeTab === 'styleguide' && (
            <motion.div key="styleguide" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0}} className="absolute inset-0 flex flex-col md:flex-row gap-6">
               <div className="flex-1 flex flex-col bg-bg-surface border border-border-default rounded-xl overflow-hidden shadow-sm h-full">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-border-subtle bg-bg-surface-elevated shrink-0">
                     <div className="flex text-text-tertiary gap-1">
                        <button className="p-1.5 hover:bg-bg-surface hover:text-text-primary rounded transition-colors" title="Negrito"><Bold className="w-4 h-4" /></button>
                        <button className="p-1.5 hover:bg-bg-surface hover:text-text-primary rounded transition-colors" title="Itálico"><Italic className="w-4 h-4" /></button>
                        <button className="p-1.5 hover:bg-bg-surface hover:text-text-primary rounded transition-colors" title="Título"><Heading className="w-4 h-4" /></button>
                        <div className="w-px h-4 bg-border-default my-auto mx-1"></div>
                        <button className="p-1.5 hover:bg-bg-surface hover:text-text-primary rounded transition-colors" title="Lista"><ListIcon className="w-4 h-4" /></button>
                        <button className="p-1.5 hover:bg-bg-surface hover:text-text-primary rounded transition-colors" title="Link"><LinkIcon className="w-4 h-4" /></button>
                        <button className="p-1.5 hover:bg-bg-surface hover:text-text-primary rounded transition-colors" title="Imagem"><ImageIcon className="w-4 h-4" /></button>
                     </div>
                     <span className="text-[10px] uppercase font-bold text-text-tertiary">
                        {isSavingMs ? 'Salvando...' : 'Markdown Base'}
                     </span>
                  </div>
                  <textarea 
                    value={styleGuideMd}
                    onChange={handleStyleGuideChange}
                    className="flex-1 w-full bg-transparent p-6 text-sm text-text-primary resize-none outline-none font-mono leading-relaxed custom-scrollbar focus:ring-0"
                    placeholder="# Style Guide..."
                    spellCheck="false"
                  ></textarea>
               </div>
               <div className="flex-1 bg-bg-surface border border-border-default rounded-xl overflow-y-auto custom-scrollbar p-8 shadow-sm h-full markdown-body prose prose-invert prose-headings:text-text-primary prose-p:text-text-secondary prose-a:text-accent prose-strong:text-text-primary prose-ul:text-text-secondary w-full max-w-none">
                  <ReactMarkdown>{styleGuideMd}</ReactMarkdown>
               </div>
            </motion.div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'settings' && (
            <motion.div key="settings" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0}} className="absolute inset-0 flex flex-col md:flex-row gap-8 overflow-y-auto custom-scrollbar content-start">
               {/* Forms */}
               <div className="w-full md:max-w-[600px] flex flex-col gap-8 pb-8">
                  <div className="bg-bg-surface border border-border-default rounded-xl p-6 shadow-sm">
                     <h3 className="text-lg font-bold text-text-primary mb-6">Informações Gerais</h3>
                     <div className="space-y-5">
                       <div className="space-y-2">
                         <Label className="text-xs font-bold uppercase tracking-widest text-text-secondary">Nome da Marca</Label>
                         <Input value={settingsForm.name || ''} onChange={e => setSettingsForm({...settingsForm, name: e.target.value})} className="bg-bg-base border-border-default focus:border-accent shadow-sm" />
                       </div>
                       <div className="flex flex-col sm:flex-row gap-5">
                         <div className="space-y-2 flex-1">
                           <Label className="text-xs font-bold uppercase tracking-widest text-text-secondary">Slug / URL</Label>
                           <Input disabled value={settingsForm.slug || ''} className="bg-bg-base border-border-default opacity-60 font-mono text-xs shadow-sm cursor-not-allowed" />
                           <p className="text-[10px] text-text-tertiary mt-1">O slug não pode ser alterado após criação.</p>
                         </div>
                         <div className="space-y-2 flex-1">
                           <Label className="text-xs font-bold uppercase tracking-widest text-text-secondary">Contrato (Vídeos/Mês)</Label>
                           <Input type="number" value={settingsForm.total_videos_contracted || 0} onChange={e => setSettingsForm({...settingsForm, total_videos_contracted: parseInt(e.target.value)})} className="bg-bg-base border-border-default focus:border-accent shadow-sm" />
                         </div>
                       </div>
                       <div className="flex gap-5 items-end">
                         <div className="space-y-2 flex-1 relative group">
                           <Label className="text-xs font-bold uppercase tracking-widest text-text-secondary">Cor da Marca (Hex)</Label>
                           <div className="flex bg-bg-base border border-border-default rounded-md overflow-hidden p-1 shadow-sm mt-1 focus-within:border-accent focus-within:ring-1 focus-within:ring-accent/50 transition-all">
                             <input type="color" value={settingsForm.brand_color || '#000000'} onChange={e => setSettingsForm({...settingsForm, brand_color: e.target.value})} className="w-12 h-8 rounded border-none cursor-pointer bg-transparent shrink-0 focus:outline-none" />
                             <input type="text" value={settingsForm.brand_color || '#000000'} onChange={e => setSettingsForm({...settingsForm, brand_color: e.target.value})} className="h-8 border-none bg-transparent flex-1 focus:outline-none focus:ring-0 font-mono text-sm px-2 uppercase" />
                           </div>
                         </div>
                         <div className="space-y-2 flex-1">
                           <Label className="text-xs font-bold uppercase tracking-widest text-text-secondary">Instagram Handle</Label>
                           <Input value={settingsForm.instagram_handle || ''} onChange={e => setSettingsForm({...settingsForm, instagram_handle: e.target.value})} placeholder="@marca" className="bg-bg-base border-border-default focus:border-accent shadow-sm" />
                         </div>
                       </div>
                       <div className="space-y-2">
                         <Label className="text-xs font-bold uppercase tracking-widest text-text-secondary">Notas Internas</Label>
                         <Textarea value={settingsForm.notes || ''} onChange={e => setSettingsForm({...settingsForm, notes: e.target.value})} className="bg-bg-base border-border-default focus:border-accent min-h-[100px] resize-none shadow-sm" placeholder="Instruções gerais, links de drive..." />
                       </div>
                     </div>
                     <div className="mt-8 flex justify-end">
                       <Button onClick={handleSaveSettings} className="bg-accent hover:bg-accent-hover text-white px-8 shadow-sm">Salvar Alterações</Button>
                     </div>
                  </div>

                  {appUser?.role === 'admin' && (
                    <div className="border border-danger/30 bg-danger-subtle/10 rounded-xl p-6">
                       <h3 className="text-lg font-bold text-danger mb-2">Zona de Perigo</h3>
                       <p className="text-sm text-danger/80 mb-6">Ações irreversíveis e críticas para a conta deste cliente.</p>
                       <div className="flex gap-4">
                         {client.status !== 'archived' && (
                           <Button variant="outline" onClick={() => handleAction('archive')} className="border-warning text-warning hover:bg-warning hover:text-white transition-colors bg-transparent">Arquivar Cliente</Button>
                         )}
                         <Button variant="outline" onClick={() => handleAction('delete')} className="border-danger text-danger hover:bg-danger hover:text-white transition-colors bg-transparent">Excluir Permanente</Button>
                       </div>
                    </div>
                  )}
               </div>
               
               {/* Sidebar Configs */}
               <div className="w-full md:max-w-[320px] pb-8">
                  <div className="bg-bg-surface border border-border-default rounded-xl p-6 shadow-sm mb-6">
                     <h4 className="text-sm font-bold text-text-primary mb-4 flex items-center gap-2"><User className="w-4 h-4" /> Editores Autorizados</h4>
                     <p className="text-xs text-text-secondary mb-4">Escolha os editores que podem ver e puxar vídeos deste cliente.</p>
                     <div className="border border-border-default rounded-md p-3 bg-bg-base text-center text-xs text-text-tertiary">
                       Em breve: Multi-select de editores.
                     </div>
                  </div>

                  <div className="bg-bg-surface border border-border-default rounded-xl p-6 shadow-sm">
                     <h4 className="text-sm font-bold text-text-primary mb-4 flex items-center gap-2"><CalendarIcon className="w-4 h-4" /> Integrações</h4>
                     <p className="text-xs text-text-secondary mb-4">Configure o webhook personalizado pro Pipe de {client.name}.</p>
                     <Input placeholder="https://n8n.webhook.com/..." className="bg-bg-base border-border-default text-xs h-9 mb-2" />
                     <Button variant="outline" className="w-full text-xs h-8 bg-bg-surface border-border-default text-text-secondary hover:text-text-primary">Testar Webhook</Button>
                  </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </PageTransition>
  );
}
