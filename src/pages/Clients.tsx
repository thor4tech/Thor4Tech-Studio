import { useState, useEffect, useMemo } from "react";
import { collection, query, setDoc, doc, onSnapshot, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/auth";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "../components/ui/dropdown-menu";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Plus, MoreHorizontal, FolderKanban, Users, Search, ChevronDown, Calendar, ArchiveRestore, Archive, Pause, Play, Trash2, Network, User } from "lucide-react";
import PageTransition from "../components/PageTransition";
import { motion, AnimatePresence } from "motion/react";
import { isPast, differenceInDays, isSameDay, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { HexColorPicker } from "react-colorful";

export default function Clients() {
  const { appUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [clients, setClients] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(searchParams.get("new") === "true");
  
  const [formData, setFormData] = useState({ 
    name: '', 
    slug: '', 
    brand_color: '#F26522', 
    instagram_handle: '',
    total_videos_contracted: 8,
    notes: '' 
  });
  
  // Toolbar state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "paused">("active");
  const [sortOrder, setSortOrder] = useState<"deadline" | "name" | "progress" | "recent">("deadline");
  const [showArchived, setShowArchived] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Handle ?new=true
  useEffect(() => {
    if (searchParams.get("new") === "true") {
      setOpen(true);
      setSearchParams(new URLSearchParams());
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    // Escuta videos
    const unsubVideos = onSnapshot(query(collection(db, "videos")), (snapshot) => {
       const v = snapshot.docs.map(d => ({id: d.id, ...d.data()}));
       setVideos(v);
    });

    // Escuta clients
    const q = query(collection(db, "clients"));
    const unsubClients = onSnapshot(q, (snapshot) => {
      let c = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Viewers filter
      if (appUser?.role === 'viewer') {
        c = c.filter((item: any) => appUser.client_ids?.includes(item.id));
      }
      setClients(c);
      
      // Delay min for skeleton
      setTimeout(() => setLoading(false), 500);
    }, (error) => {
      console.error(error);
    });
    
    return () => {
       unsubVideos();
       unsubClients();
    };
  }, [appUser]);

  // Derivações combinadas: merge clients with their video stats
  const enrichedClients = useMemo(() => {
    return clients.map(client => {
      const clientVideos = videos.filter(v => v.client_id === client.id);
      
      // Entregues = posted + approved + delivered (depende do que significa "entregue", vamos usar posted e approved)
      const deliveredCount = clientVideos.filter(v => v.status === 'posted' || v.status === 'approved').length;
      
      // Atrasados
      const delayedCount = clientVideos.filter(v => v.deadline && v.status !== 'posted' && v.status !== 'approved' && isPast(new Date(v.deadline))).length;
      const inProductionCount = clientVideos.filter(v => v.status !== 'posted' && v.status !== 'archived').length;
      
      // Próxima deadline
      const activeVideosWithDeadline = clientVideos.filter(v => v.status !== 'posted' && v.status !== 'archived' && v.deadline);
      activeVideosWithDeadline.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
      const nextDeadline = activeVideosWithDeadline.length > 0 ? activeVideosWithDeadline[0].deadline : null;
      
      // Editores envolvidos (unique)
      const editors = Array.from(new Set(clientVideos.filter(v => v.editor_id).map(v => v.editor_id)));

      return {
        ...client,
        deliveredCount,
        delayedCount,
        inProductionCount,
        nextDeadline,
        editors
      };
    });
  }, [clients, videos]);

  // Filtros e Busca
  const displayedClients = useMemo(() => {
    let result = enrichedClients;

    // Arquivados
    if (showArchived) {
      result = result.filter(c => c.status === 'archived');
    } else {
      result = result.filter(c => c.status !== 'archived');
      
      // Status
      if (filterStatus !== 'all') {
        result = result.filter(c => c.status === filterStatus);
      }
    }

    // Busca
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => 
        c.name.toLowerCase().includes(q) || 
        (c.instagram_handle && c.instagram_handle.toLowerCase().includes(q))
      );
    }

    // Ordenação
    result.sort((a, b) => {
      if (sortOrder === 'name') return a.name.localeCompare(b.name);
      if (sortOrder === 'recent') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortOrder === 'progress') {
         const pA = a.total_videos_contracted ? a.deliveredCount / a.total_videos_contracted : 0;
         const pB = b.total_videos_contracted ? b.deliveredCount / b.total_videos_contracted : 0;
         return pB - pA;
      }
      if (sortOrder === 'deadline') {
         if (!a.nextDeadline) return 1;
         if (!b.nextDeadline) return -1;
         return new Date(a.nextDeadline).getTime() - new Date(b.nextDeadline).getTime();
      }
      return 0;
    });

    return result;
  }, [enrichedClients, showArchived, filterStatus, searchQuery, sortOrder]);


  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.slug) return;
    try {
      const clientId = formData.slug.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const newClient = {
        id: clientId,
        ...formData,
        slug: clientId,
        total_videos_delivered: 0,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      await setDoc(doc(db, "clients", clientId), newClient);
      toast.success("Cliente criado!");
      setOpen(false);
      setFormData({ name: '', slug: '', brand_color: '#F26522', instagram_handle: '', total_videos_contracted: 8, notes: '' });
      
      // Could scroll to it later
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleAction = async (e: React.MouseEvent, action: string, clientId: string) => {
    e.stopPropagation();
    e.preventDefault();
    
    try {
       const clientRef = doc(db, "clients", clientId);
       if (action === 'archive') {
         await updateDoc(clientRef, { status: 'archived', updated_at: new Date().toISOString() });
         toast.success("Cliente arquivado");
       } else if (action === 'pause') {
         await updateDoc(clientRef, { status: 'paused', updated_at: new Date().toISOString() });
         toast.success("Cliente pausado");
       } else if (action === 'reactivate') {
         await updateDoc(clientRef, { status: 'active', updated_at: new Date().toISOString() });
         toast.success("Cliente reativado");
       } else if (action === 'delete') {
         if(window.confirm("Certeza? Essa ação não pode ser desfeita e excluirá o cliente.")) {
           if(window.confirm("ABSOLUTA CERTEZA?")) {
             await deleteDoc(clientRef);
             toast.success("Cliente excluído permanentemente");
           }
         }
       }
    } catch(err: any) {
       toast.error("Erro ao realizar ação");
    }
  };

  if (loading) {
     return (
       <div className="p-8 max-w-[1400px] mx-auto space-y-8">
         <div className="h-10 w-48 bg-bg-surface-elevated animate-pulse rounded"></div>
         <div className="h-10 w-full bg-bg-surface-elevated animate-pulse rounded"></div>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
           {[1,2,3,4,5,6].map(i => <div key={i} className="h-64 bg-bg-surface border border-border-default rounded-xl animate-pulse"></div>)}
         </div>
       </div>
     );
  }

  // EMPTY ACTIVE (first time ever)
  if (clients.length === 0) {
     return (
        <PageTransition className="flex-1 flex flex-col items-center justify-center p-8 bg-bg-base">
           <div className="text-center space-y-6 max-w-[480px]">
             <Network className="w-16 h-16 text-accent mx-auto" />
             <h2 className="text-3xl font-bold tracking-tight text-text-primary">Nenhum cliente ainda</h2>
             <p className="text-base text-text-secondary leading-relaxed">
               Adicione seu primeiro cliente pra começar a organizar a produção da sua agência e convidar sua equipe.
             </p>
             {appUser?.role === 'admin' && (
               <Button onClick={() => setOpen(true)} className="h-12 px-8 bg-accent hover:bg-accent-hover text-white shadow-[0_4px_14px_rgba(242,101,34,0.3)] w-full">
                 <Plus className="w-4 h-4 mr-2" /> Adicionar Cliente
               </Button>
             )}
           </div>
           
           {/* Modals are repeated here so they work in empty state */}
           {appUser?.role === 'admin' && (
              <Dialog open={open} onOpenChange={setOpen}>
                 <DialogContent className="bg-bg-surface-elevated border-border-default text-text-primary rounded-xl max-w-[480px]">
                     {/* Placeholder pra fechar bonitinho */}
                     <DialogHeader className="border-b border-border-subtle pb-4">
                       <DialogTitle className="text-lg font-semibold tracking-tight">Adicionar Cliente</DialogTitle>
                     </DialogHeader>
                     <form onSubmit={handleCreateClient} className="space-y-5 pt-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-text-secondary uppercase tracking-[0.08em] font-medium">Nome da Marca <span className="text-danger">*</span></Label>
                          <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value, slug: e.target.value.toLowerCase().replace(/ /g, '-')})} className="bg-bg-base border-border-default focus:border-accent" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-text-secondary uppercase tracking-[0.08em] font-medium">Slug <span className="text-danger">*</span></Label>
                          <Input required value={formData.slug} onChange={e => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-')})} className="bg-bg-base border-border-default focus:border-accent font-mono text-xs" />
                        </div>
                        <div className="flex gap-4">
                          <div className="space-y-1.5 flex-1">
                            <Label className="text-xs text-text-secondary uppercase tracking-[0.08em] font-medium">Cor Brand <span className="text-danger">*</span></Label>
                            <input type="color" value={formData.brand_color} onChange={e => setFormData({...formData, brand_color: e.target.value})} className="h-10 w-full rounded border-none cursor-pointer bg-bg-base" />
                          </div>
                          <div className="space-y-1.5 flex-1">
                            <Label className="text-xs text-text-secondary uppercase tracking-[0.08em] font-medium">Total Vídeos/Mês</Label>
                            <Input type="number" value={formData.total_videos_contracted} onChange={e => setFormData({...formData, total_videos_contracted: parseInt(e.target.value) || 0})} className="bg-bg-base border-border-default focus:border-accent" />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-text-secondary uppercase tracking-[0.08em] font-medium">Instagram Handle</Label>
                          <Input value={formData.instagram_handle} onChange={e => setFormData({...formData, instagram_handle: e.target.value})} placeholder="@marca" className="bg-bg-base border-border-default focus:border-accent" />
                        </div>
                        <div className="pt-2 flex justify-end">
                          <Button type="submit" className="bg-accent hover:bg-accent-hover text-white">Criar Cliente</Button>
                        </div>
                     </form>
                 </DialogContent>
              </Dialog>
           )}
        </PageTransition>
     )
  }

  return (
    <PageTransition className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-6 md:space-y-8 flex flex-col h-[100vh]">
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-border-subtle pb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Clientes</h1>
          <p className="text-xs text-text-secondary mt-1 uppercase tracking-widest font-medium">Gerencie marcas e acompanhe o funil de entrega</p>
        </div>
        
        {appUser?.role === 'admin' && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-semibold transition-all shadow-[0_2px_8px_rgba(242,101,34,0.25)] h-10 px-5 bg-accent hover:bg-accent-hover text-white active:scale-[0.98]">
                <Plus className="w-4 h-4 mr-2" />
                Novo Cliente
            </DialogTrigger>
            <DialogContent className="bg-bg-surface-elevated border-border-default text-text-primary rounded-xl max-w-[480px]">
              <DialogHeader className="border-b border-border-subtle pb-4">
                <DialogTitle className="text-lg font-semibold tracking-tight">Adicionar Cliente</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateClient} className="space-y-5 pt-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-text-secondary uppercase tracking-[0.08em] font-medium">Nome da Marca <span className="text-danger">*</span></Label>
                    <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value, slug: e.target.value.toLowerCase().replace(/ /g, '-')})} className="bg-bg-base border-border-default focus:border-accent" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-text-secondary uppercase tracking-[0.08em] font-medium">Slug <span className="text-danger">*</span></Label>
                    <Input required value={formData.slug} onChange={e => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-')})} className="bg-bg-base border-border-default focus:border-accent font-mono text-xs" />
                  </div>
                  <div className="flex gap-4">
                    <div className="space-y-1.5 flex-1">
                      <Label className="text-xs text-text-secondary uppercase tracking-[0.08em] font-medium">Cor Brand <span className="text-danger">*</span></Label>
                      {/* Can use real type="color" or react-colorful. We'll use HexColorPicker for a more premium feel, but here standard works best in a tiny popover */}
                      <div className="flex bg-bg-base border border-border-default rounded-md overflow-hidden p-1">
                         <input type="color" value={formData.brand_color} onChange={e => setFormData({...formData, brand_color: e.target.value})} className="w-12 h-8 rounded border-none cursor-pointer bg-transparent" />
                         <Input value={formData.brand_color} onChange={e => setFormData({...formData, brand_color: e.target.value})} className="h-8 border-none bg-transparent flex-1 focus-visible:ring-0" />
                      </div>
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <Label className="text-xs text-text-secondary uppercase tracking-[0.08em] font-medium">Total Vídeos/Mês</Label>
                      <Input type="number" value={formData.total_videos_contracted} onChange={e => setFormData({...formData, total_videos_contracted: parseInt(e.target.value) || 0})} className="bg-bg-base border-border-default focus:border-accent" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-text-secondary uppercase tracking-[0.08em] font-medium">Instagram Handle</Label>
                    <Input value={formData.instagram_handle} onChange={e => setFormData({...formData, instagram_handle: e.target.value})} placeholder="@marca" className="bg-bg-base border-border-default focus:border-accent" />
                  </div>
                  <div className="space-y-1.5">
                     <Label className="text-xs text-text-secondary uppercase tracking-[0.08em] font-medium">Notas adicionais</Label>
                     <Textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="bg-bg-base border-border-default focus:border-accent resize-none min-h-[80px]" placeholder="Instruções de edição, pastas, docs..." />
                  </div>
                  <div className="pt-2 flex justify-end">
                    <Button type="submit" className="bg-accent hover:bg-accent-hover text-white shadow-[0_2px_8px_rgba(242,101,34,0.3)]">Criar Cliente</Button>
                  </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* TOOLBAR */}
      <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 shrink-0">
         <div className="relative flex-1 min-w-[200px] max-w-[320px]">
            <Search className="w-4 h-4 text-text-tertiary absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Buscar cliente..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-bg-surface border border-border-default h-10 rounded-md pl-9 pr-4 text-sm text-text-primary focus:border-accent focus:ring-1 focus:ring-accent/50 outline-none transition-all" 
            />
         </div>

         <div className="flex flex-wrap gap-2">
            {!showArchived && (
               <DropdownMenu>
                 <DropdownMenuTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium h-10 px-4 py-2 border bg-bg-surface border-border-default text-text-secondary hover:text-text-primary gap-2 select-none outline-none">
                   {filterStatus === 'all' ? 'Todos' : filterStatus === 'active' ? 'Ativos' : 'Pausados'} <ChevronDown className="w-3.5 h-3.5" />
                 </DropdownMenuTrigger>
                 <DropdownMenuContent align="end" className="w-40 border-border-default bg-bg-surface-elevated text-text-primary shadow-xl">
                    <DropdownMenuItem onClick={() => setFilterStatus('all')} className="focus:bg-bg-surface-active focus:text-text-primary cursor-pointer">Todos</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilterStatus('active')} className="focus:bg-bg-surface-active focus:text-text-primary cursor-pointer">Ativos</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilterStatus('paused')} className="focus:bg-bg-surface-active focus:text-text-primary cursor-pointer">Pausados</DropdownMenuItem>
                 </DropdownMenuContent>
               </DropdownMenu>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium h-10 px-4 py-2 border bg-bg-surface border-border-default text-text-secondary hover:text-text-primary gap-2 select-none outline-none">
                Ordenar: {sortOrder === 'deadline' ? 'Próx Deadline' : sortOrder === 'name' ? 'Nome A-Z' : sortOrder === 'progress' ? '% Entregue' : 'Recente'} <ChevronDown className="w-3.5 h-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 border-border-default bg-bg-surface-elevated text-text-primary shadow-xl">
                 <DropdownMenuItem onClick={() => setSortOrder('deadline')} className="focus:bg-bg-surface-active focus:text-text-primary cursor-pointer">Próxima deadline</DropdownMenuItem>
                 <DropdownMenuItem onClick={() => setSortOrder('name')} className="focus:bg-bg-surface-active focus:text-text-primary cursor-pointer">Nome A-Z</DropdownMenuItem>
                 <DropdownMenuItem onClick={() => setSortOrder('progress')} className="focus:bg-bg-surface-active focus:text-text-primary cursor-pointer">% Entregue</DropdownMenuItem>
                 <DropdownMenuItem onClick={() => setSortOrder('recent')} className="focus:bg-bg-surface-active focus:text-text-primary cursor-pointer">Mais recentes</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <label className="flex items-center gap-2 px-3 py-2 border border-border-default rounded-md bg-bg-surface cursor-pointer select-none">
              <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="rounded border-border-strong bg-transparent accent-accent w-4 h-4" />
              <span className="text-sm font-medium text-text-secondary">Arquivados</span>
            </label>
         </div>
      </div>

      {/* GRID */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-8">
        {displayedClients.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center bg-bg-surface/30 rounded-xl border border-dashed border-border-default">
             <Search className="w-10 h-10 text-text-tertiary mb-4 opacity-50" />
             <h3 className="text-lg font-semibold text-text-primary">Nenhum cliente encontrado</h3>
             <p className="text-text-secondary mt-1">Tente limpar os filtros ou usar outra busca.</p>
             {(searchQuery || filterStatus !== 'all' || showArchived) && (
               <Button variant="ghost" onClick={() => {setSearchQuery(''); setFilterStatus('all'); setShowArchived(false);}} className="mt-4 text-accent border border-accent/20 hover:bg-accent-subtle">
                 Limpar Filtros
               </Button>
             )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence mode="popLayout">
              {displayedClients.map((client, i) => {
                const isArchived = client.status === 'archived';
                const progress = client.total_videos_contracted ? Math.min(Math.round((client.deliveredCount / client.total_videos_contracted) * 100), 100) : 0;
                
                // Determine Deadline label & color
                let deadlineLabel = "";
                let deadlineColorObj = { bg: "bg-bg-surface-elevated", text: "text-text-secondary", border: "border-border-default" };
                
                if (client.nextDeadline) {
                   const deadlineDate = new Date(client.nextDeadline);
                   const daysTo = differenceInDays(deadlineDate, new Date());
                   if (daysTo < 0 && !isSameDay(deadlineDate, new Date())) {
                     deadlineLabel = "Atrasado";
                     deadlineColorObj = { bg: "bg-danger-subtle/50", text: "text-danger", border: "border-danger/20" };
                   } else if (isSameDay(deadlineDate, new Date())) {
                     deadlineLabel = "Hoje";
                     deadlineColorObj = { bg: "bg-danger-subtle/50", text: "text-danger", border: "border-danger/20" };
                   } else if (daysTo <= 3) {
                     deadlineLabel = `Em ${daysTo} dias`;
                     deadlineColorObj = { bg: "bg-warning-subtle/50", text: "text-warning", border: "border-warning/20" };
                   } else {
                     deadlineLabel = `Em ${daysTo} dias`;
                     deadlineColorObj = { bg: "bg-bg-surface-active", text: "text-text-secondary", border: "border-border-default" };
                   }
                } else {
                   deadlineLabel = "Nenhuma pendente";
                }

                return (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, scale: 0.95 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    key={client.id} 
                    className={`h-full ${isArchived ? 'opacity-60' : ''}`}
                  >
                    <div 
                      className="bg-bg-surface rounded-xl border border-border-default overflow-hidden hover:border-border-strong hover:-translate-y-1 hover:shadow-lg transition-all duration-300 group flex flex-col relative h-full cursor-pointer"
                      onClick={() => navigate(`/clients/${client.slug}`)}
                    >
                      {/* HEADER GRADIENT */}
                      <div 
                        className="h-[100px] w-full relative flex items-center justify-center shrink-0 border-b border-border-subtle"
                        style={{ background: `linear-gradient(135deg, ${client.brand_color}44 0%, #0A0A0A 100%)` }}
                      >
                         <h2 className="text-5xl font-black text-white/90 drop-shadow-md select-none">{client.name.charAt(0).toUpperCase()}</h2>
                         {isArchived && (
                           <span className="absolute top-3 left-3 bg-black/60 text-white backdrop-blur px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border border-white/10">Arquivado</span>
                         )}
                         {client.status === 'paused' && (
                           <span className="absolute top-3 left-3 bg-warning/20 text-warning backdrop-blur px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border border-warning/20">Pausado</span>
                         )}
                         {appUser?.role === 'admin' && (
                            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                              <DropdownMenu>
                                <DropdownMenuTrigger onClick={e => e.stopPropagation()} className="w-8 h-8 rounded-md bg-black/40 hover:bg-black/80 backdrop-blur text-white flex items-center justify-center transition-colors border border-white/10 outline-none select-none">
                                  <MoreHorizontal className="w-4 h-4" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40 border-border-default bg-bg-surface-elevated text-text-primary shadow-xl" onClick={e => e.stopPropagation()}>
                                   {isArchived ? (
                                      <DropdownMenuItem onClick={(e) => handleAction(e, 'reactivate', client.id)} className="focus:bg-bg-surface-active focus:text-text-primary cursor-pointer"><ArchiveRestore className="w-4 h-4 mr-2" /> Reativar</DropdownMenuItem>
                                   ) : (
                                      <>
                                        {client.status === 'paused' ? (
                                           <DropdownMenuItem onClick={(e) => handleAction(e, 'reactivate', client.id)} className="focus:bg-bg-surface-active focus:text-text-primary cursor-pointer"><Play className="w-4 h-4 mr-2" /> Retomar</DropdownMenuItem>
                                        ) : (
                                           <DropdownMenuItem onClick={(e) => handleAction(e, 'pause', client.id)} className="focus:bg-bg-surface-active focus:text-text-primary cursor-pointer"><Pause className="w-4 h-4 mr-2" /> Pausar</DropdownMenuItem>
                                        )}
                                        <DropdownMenuItem onClick={(e) => handleAction(e, 'archive', client.id)} className="focus:bg-bg-surface-active focus:text-text-primary cursor-pointer"><Archive className="w-4 h-4 mr-2" /> Arquivar</DropdownMenuItem>
                                      </>
                                   )}
                                   <DropdownMenuSeparator className="bg-border-subtle" />
                                   <DropdownMenuItem onClick={(e) => handleAction(e, 'delete', client.id)} className="focus:bg-danger-subtle focus:text-danger text-danger cursor-pointer"><Trash2 className="w-4 h-4 mr-2" /> Excluir</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                         )}
                      </div>

                      {/* BODY */}
                      <div className="p-4 flex flex-col flex-1">
                         <div className="mb-3">
                           <h3 className="text-lg font-semibold text-text-primary tracking-tight line-clamp-1">{client.name}</h3>
                           {client.instagram_handle && (
                             <a href={`https://instagram.com/${client.instagram_handle.replace('@','')}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-[13px] text-text-tertiary hover:text-accent font-mono transition-colors">
                               @{client.instagram_handle.replace('@','')}
                             </a>
                           )}
                         </div>

                         {/* PROGRESS */}
                         <div className="mt-1 mb-4">
                           <div className="flex justify-between items-end mb-1.5">
                             <span className="text-xs text-text-secondary font-medium">{client.deliveredCount} / {client.total_videos_contracted || 0} entregues</span>
                           </div>
                           <div className="w-full h-1.5 bg-bg-surface-elevated rounded-full overflow-hidden mb-1">
                             <div className={`h-full ${progress === 100 ? 'bg-success' : 'bg-accent'} rounded-full transition-all duration-500 ease-out`} style={{ width: `${progress}%` }}></div>
                           </div>
                           {(client.inProductionCount > 0 || client.delayedCount > 0) && (
                             <p className="text-[10px] text-text-tertiary font-medium">
                               {client.inProductionCount} em produção {client.delayedCount > 0 && <span className="text-danger font-bold">· {client.delayedCount} atrasados</span>}
                             </p>
                           )}
                         </div>

                         {/* DEADLINE */}
                         <div className={`flex items-center justify-between p-2.5 rounded-lg border ${deadlineColorObj.border} ${deadlineColorObj.bg}`}>
                            <div className="flex items-center gap-2">
                               <Calendar className={`w-4 h-4 ${deadlineColorObj.text}`} />
                               <span className={`text-xs font-bold uppercase tracking-wider ${deadlineColorObj.text}`}>{deadlineLabel}</span>
                            </div>
                            {client.nextDeadline && (
                               <span className="text-[10px] text-text-tertiary font-mono">{format(parseISO(client.nextDeadline), 'dd/MM/yy')}</span>
                            )}
                         </div>

                         {/* EDITORS */}
                         <div className="mt-auto pt-4 flex items-center justify-between">
                            <div className="flex items-center">
                              {client.editors?.length > 0 ? (
                                <div className="flex items-center">
                                  <div className="flex -space-x-2 mr-2">
                                    {client.editors.slice(0,3).map((e: string, idx: number) => (
                                      <div key={idx} className="w-7 h-7 rounded-full bg-bg-base border-2 border-bg-surface flex items-center justify-center shadow-sm">
                                         <User className="w-3.5 h-3.5 text-text-secondary" />
                                      </div>
                                    ))}
                                  </div>
                                  {client.editors.length > 3 && (
                                     <span className="text-[10px] font-bold text-text-tertiary">+{client.editors.length - 3} mais</span>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 opacity-50">
                                   <div className="w-6 h-6 rounded-full border border-dashed border-text-tertiary flex items-center justify-center">
                                      <User className="w-3 h-3 text-text-tertiary" />
                                   </div>
                                   <span className="text-[10px] font-medium text-text-tertiary uppercase tracking-widest">Nenhum</span>
                                </div>
                              )}
                            </div>
                         </div>
                      </div>

                      {/* FOOTER */}
                      <div className="p-1 px-4 pb-4">
                         <Button variant="ghost" className="w-full bg-transparent hover:bg-bg-surface-elevated text-text-secondary hover:text-text-primary border border-transparent hover:border-border-default h-10 shadow-none font-semibold transition-all">
                            Ver pipeline
                         </Button>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
