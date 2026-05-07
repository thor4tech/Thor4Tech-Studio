import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { doc, collection, query, where, onSnapshot, addDoc, updateDoc, serverTimestamp, orderBy, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/auth";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Play, Pause, ExternalLink, ArrowLeft, Download, Video, Maximize, Settings, CheckCircle2, CornerDownRight, MessageSquarePlus, Share2, MoreHorizontal, VideoOff, MessageSquare, Plus, FileVideo, User } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import DOMPurify from 'dompurify';
import PageTransition from "../components/PageTransition";
import { motion, AnimatePresence } from "motion/react";

const COLUMNS = [
  { id: 'raw_received', label: 'BRUTOS', color: 'bg-bg-surface-elevated text-text-tertiary border-border-default' },
  { id: 'briefing_ready', label: 'BRIEFING', color: 'bg-info-subtle text-info border-info/20' },
  { id: 'in_editing', label: 'EDIÇÃO', color: 'bg-accent-subtle text-accent border-accent/20' },
  { id: 'v1_delivered', label: 'V1 PRONTA', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  { id: 'in_review', label: 'REVISÃO', color: 'bg-warning-subtle text-warning border-warning/20' },
  { id: 'approved', label: 'APROVADO', color: 'bg-success-subtle text-success border-success/20' },
];

function formatTime(secs: number) {
  if (!secs || isNaN(secs)) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function VideoDetail() {
  const { slug, videoId } = useParams();
  const navigate = useNavigate();
  const { appUser } = useAuth();
  
  const [video, setVideo] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [editor, setEditor] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [pipelineLogs, setPipelineLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  // Player state
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrubberContainerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPos, setHoverPos] = useState<number>(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  
  // Versions and Split Screen
  const [activeVersionIdx, setActiveVersionIdx] = useState<number>(0);
  const [compareMode, setCompareMode] = useState(false);
  const [compareVersionIdx, setCompareVersionIdx] = useState<number>(0);

  // Tabs & Comments
  const [activeTab, setActiveTab] = useState("comments");
  const [commentText, setCommentText] = useState("");
  const [attachTimecode, setAttachTimecode] = useState(true);
  const [activeRawFile, setActiveRawFile] = useState<any>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  
  // Briefing
  const [briefingText, setBriefingText] = useState("");
  const [isEditingBriefing, setIsEditingBriefing] = useState(false);
  const [saveIndicator, setSaveIndicator] = useState("");

  const controlsTimeoutRef = useRef<NodeJS.Timeout>(null);

  // Focus effect for keyboard shortcuts
  useEffect(() => {
    // Keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input/textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        // Cmd+Enter to submit comment
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && activeTab === 'comments') {
          submitComment();
        }
        return;
      }
      
      const v = videoRef.current;
      if (!v) return;

      switch (e.key.toLowerCase()) {
        case ' ': // Space
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'j':
          v.currentTime = Math.max(0, v.currentTime - 10);
          break;
        case 'l':
          v.currentTime = Math.min(v.duration, v.currentTime + 10);
          break;
        case 'arrowleft':
          v.currentTime = Math.max(0, v.currentTime - 1);
          break;
        case 'arrowright':
          v.currentTime = Math.min(v.duration, v.currentTime + 1);
          break;
        case 'm':
          toggleMute();
          break;
        case 'f':
          toggleFullscreen();
          break;
        case 'c':
          e.preventDefault();
          if (isPlaying) togglePlay();
          setActiveTab('comments');
          setAttachTimecode(true);
          setTimeout(() => commentInputRef.current?.focus(), 100);
          break;
        case '1': setActiveTab('briefing'); break;
        case '2': setActiveTab('comments'); break;
        case '3': setActiveTab('pipeline'); break;
        case '4': setActiveTab('raw'); break;
        case '5': setActiveTab('details'); break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, activeTab]);

  // Data fetching
  useEffect(() => {
    if (!videoId || !slug) return;

    const vRef = doc(db, "videos", videoId);
    const unsubVideo = onSnapshot(vRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...(docSnap.data() as any) };
        setVideo(data);
        setBriefingText(data.briefing || "");
        if (data.versions?.length) {
          setActiveVersionIdx(Math.max(0, data.versions.length - 1));
          setCompareVersionIdx(Math.max(0, data.versions.length - 2));
        }
        
        // Fetch client info once
        try {
          const clientRef = doc(db, "clients", slug);
          const clientSnap = await getDoc(clientRef);
          if (clientSnap.exists()) setClient({ id: clientSnap.id, ...clientSnap.data() });
        } catch(err) { console.error(err); }

        // Fetch editor if exists
        if (data.editor_id) {
          try {
            const editorRef = doc(db, "users", data.editor_id);
            const editorSnap = await getDoc(editorRef);
            if (editorSnap.exists()) setEditor({ id: editorSnap.id, ...editorSnap.data() });
          } catch(err) { console.error(err); }
        }

        setError(false);
      } else {
        setError(true);
      }
      setLoading(false);
    });

    const qComments = query(collection(db, "comments"), where("video_id", "==", videoId));
    const unsubComments = onSnapshot(qComments, (snapshot) => {
      let c: any[] = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      c.sort((a, b) => (a.timecode_seconds || 0) - (b.timecode_seconds || 0));
      setComments(c);
    });

    const qLogs = query(collection(db, "pipeline_logs"), where("video_id", "==", videoId));
    const unsubLogs = onSnapshot(qLogs, (snapshot) => {
      let l: any[] = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      l.sort((a, b) => b.created_at?.toMillis() - a.created_at?.toMillis());
      setPipelineLogs(l);
    });

    return () => {
      unsubVideo();
      unsubComments();
      unsubLogs();
    };
  }, [videoId, slug]);

  // Briefing Auto-save
  useEffect(() => {
    if (!isEditingBriefing || !video) return;
    
    const handler = setTimeout(async () => {
      setSaveIndicator("Salvando...");
      try {
        await updateDoc(doc(db, "videos", videoId as string), {
          briefing: briefingText,
          updated_at: serverTimestamp()
        });
        setSaveIndicator(`Salvo às ${format(new Date(), 'HH:mm')}`);
      } catch (err) {
        setSaveIndicator("Erro ao salvar");
      }
    }, 2000);

    return () => clearTimeout(handler);
  }, [briefingText, isEditingBriefing]);

  // Handle Controls Visibility
  const handleMouseMovePlayer = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 2500);
    }
  };

  const handleMouseLeavePlayer = () => {
    if (isPlaying) setShowControls(false);
  };

  // Player Controls Logic
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
      setShowControls(false); // Hide quickly when playing
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      setShowControls(true); // Always show when paused
    }
  }, []);

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      // Synchronize second video if in compare mode
      if (compareMode) {
         const vCompare = document.getElementById('compare-video') as HTMLVideoElement;
         if (vCompare && Math.abs(vCompare.currentTime - videoRef.current.currentTime) > 0.5) {
             vCompare.currentTime = videoRef.current.currentTime;
         }
      }
    }
  }, [compareMode]);

  const seekTo = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const handleScrubberMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrubberContainerRef.current || !duration) return;
    const rect = scrubberContainerRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverPos(pos);
    setHoverTime(pos * duration);
  };

  const submitComment = async () => {
    if (!commentText.trim() || !appUser) return;
    try {
      await addDoc(collection(db, "comments"), {
        video_id: videoId,
        version_idx: activeVersionIdx,
        timecode_seconds: attachTimecode ? currentTime : null,
        author_id: appUser.id,
        author_name: appUser.name,
        text: commentText,
        resolved: false,
        created_at: new Date().toISOString()
      });
      toast.success("Comentário salvo!");
      setCommentText("");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const toggleResolveComment = async (commentId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, "comments", commentId), {
        resolved: !currentStatus,
        resolved_at: !currentStatus ? new Date().toISOString() : null,
        resolved_by: !currentStatus ? appUser?.name : null
      });
    } catch(err) {
      toast.error("Erro ao atualizar comentário");
    }
  };

  const changeStatus = async (newStatus: string) => {
    try {
      if(!appUser) return;
      await updateDoc(doc(db, "videos", videoId as string), {
        status: newStatus,
        updated_at: serverTimestamp()
      });
      await addDoc(collection(db, "pipeline_logs"), {
        video_id: videoId,
        video_title: video.title,
        user_name: appUser.name,
        user_id: appUser.id,
        action: 'moveu para',
        to_status: newStatus,
        created_at: serverTimestamp()
      });
      toast.success("Status atualizado");
    } catch(err) {
      toast.error("Erro ao mudar status");
    }
  };

  const generateShareLink = async () => {
    // Generate simple share logic
    toast.success("Link público copiado (Simulação)");
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-bg-base text-text-tertiary">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin mb-4" />
        <span className="text-sm">Carregando detalhes do vídeo...</span>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-bg-base/50 h-full">
        <VideoOff className="w-16 h-16 text-warning mb-4" />
        <h2 className="text-xl font-bold text-text-primary mb-2">Vídeo não encontrado</h2>
        <p className="text-text-secondary mb-6">Ele pode ter sido excluído ou você não tem permissão.</p>
        <Link to={`/clients/${slug}`}>
          <Button variant="outline" className="bg-bg-surface border-border-default text-text-secondary">Voltar para a página do cliente</Button>
        </Link>
      </div>
    );
  }

  const currentVersionUrl = activeRawFile
    ? `${(import.meta as any).env.VITE_B2_PUBLIC_BASE_URL}/${activeRawFile.key}`
    : video.versions && video.versions[activeVersionIdx] 
    ? `${(import.meta as any).env.VITE_B2_PUBLIC_BASE_URL}/${video.versions[activeVersionIdx].key}` 
    : null;
    
  const compareVersionUrl = compareMode && video.versions && video.versions[compareVersionIdx]
    ? `${(import.meta as any).env.VITE_B2_PUBLIC_BASE_URL}/${video.versions[compareVersionIdx].key}` 
    : null;

  const currentStatusObj = COLUMNS.find(c => c.id === video.status) || { label: video.status, color: 'bg-bg-surface text-text-secondary border-border-default' };
  const unresolvedComments = comments.filter(c => !c.resolved).length;

  return (
    <PageTransition className="h-full flex flex-col bg-bg-base overflow-hidden">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between px-6 py-4 border-b border-border-subtle bg-bg-surface-elevated z-10 shadow-sm shrink-0">
        <div className="flex items-center gap-4 mb-4 md:mb-0">
          <Link to={`/clients/${slug}`} className="w-8 h-8 flex items-center justify-center rounded-md border border-border-default hover:bg-bg-surface-active text-text-tertiary hover:text-text-primary transition-all shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          
          {client && (
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black text-white shrink-0 shadow-md" style={{ backgroundColor: client.brand_color || '#F26522' }}>
              {client.name.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-text-primary truncate">{video.title}</h1>
              <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider inline-flex whitespace-nowrap shrink-0 border ${currentStatusObj.color}`}>
                {currentStatusObj.label}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary mt-1">
              {client && <span className="font-medium text-text-primary">{client.name}</span>}
              <span className="text-text-tertiary hidden sm:inline">•</span>
              <span className="px-1.5 py-0.5 bg-bg-surface border border-border-default text-text-secondary rounded text-[9px] uppercase font-bold tracking-widest">{video.platform || 'REELS'}</span>
              <span className="text-text-tertiary hidden sm:inline">•</span>
              {video.deadline && (
                <span className="font-mono text-[11px] bg-bg-surface border border-border-default px-1.5 py-0.5 rounded text-text-secondary">Deadline: {format(new Date(video.deadline), 'dd/MM/yy')}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" onClick={generateShareLink} className="h-9 bg-bg-surface border-border-default text-text-secondary hover:text-text-primary hidden sm:flex">
            <Share2 className="w-4 h-4 mr-2" /> Compartilhar
          </Button>

          {appUser?.role === 'admin' && (
             <div className="flex gap-2">
                {video.status === 'in_review' && (
                  <Button onClick={() => changeStatus('approved')} className="h-9 bg-success hover:bg-success/90 text-black shadow-[0_2px_8px_rgba(34,197,94,0.3)]">
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Aprovar V{activeVersionIdx + 1}
                  </Button>
                )}
                <Button variant="outline" className="w-9 h-9 p-0 bg-bg-surface border-border-default text-text-secondary hover:text-text-primary">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
             </div>
          )}
        </div>
      </div>

      {/* CONTENT GRID */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        
        {/* LEFT COLUMN: PLAYER */}
        <div ref={containerRef} className="w-full lg:w-[60%] flex flex-col bg-black relative lg:border-r border-border-subtle group" onMouseMove={handleMouseMovePlayer} onMouseLeave={handleMouseLeavePlayer}>
          
          {/* Top Overlays */}
          <div className={`absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent z-10 transition-opacity duration-300 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'}`}>
            <div className="flex justify-between items-start">
              {/* Version Selector */}
              {activeRawFile ? (
                <div className="flex gap-1.5">
                   <button 
                     onClick={() => setActiveRawFile(null)}
                     className="px-3 py-1.5 text-xs font-bold rounded-md uppercase tracking-wider transition-all border bg-accent text-white border-accent shadow-[0_2px_8px_rgba(242,101,34,0.4)]"
                   >
                     VENDO BRUTO: {activeRawFile.name || 'Arquivo'} &times;
                   </button>
                </div>
              ) : video.versions && video.versions.length > 0 && (
                <div className="flex gap-1.5">
                  {video.versions.map((ver: any, idx: number) => (
                    <button 
                      key={idx}
                      onClick={() => setActiveVersionIdx(idx)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-md uppercase tracking-wider transition-all border ${
                        idx === activeVersionIdx 
                          ? 'bg-accent text-white border-accent shadow-[0_2px_8px_rgba(242,101,34,0.4)]' 
                          : 'bg-black/40 text-text-secondary border-white/20 hover:bg-white/10 hover:text-white backdrop-blur-sm'
                      }`}
                    >
                      V{idx + 1} {idx === video.versions.length - 1 && '(Atual)'}
                    </button>
                  ))}
                  {appUser?.role === 'admin' && video.versions.length > 1 && (
                     <button 
                       onClick={() => setCompareMode(!compareMode)}
                       className={`px-2 py-1.5 text-[10px] font-bold rounded-md uppercase tracking-wider transition-all border outline-none ${
                         compareMode ? 'bg-info/20 text-info border-info/40' : 'bg-black/40 text-text-tertiary border-white/10 hover:bg-white/10 hover:text-white'
                       }`}
                       title="Comparar versões lado a lado"
                     >
                       Compare {compareMode ? 'On' : 'Off'}
                     </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Player Area */}
          <div className="flex-1 flex relative items-center justify-center overflow-hidden" onClick={togglePlay}>
            {currentVersionUrl ? (
              compareMode && compareVersionUrl ? (
                /* SPLIT SCREEN MODE */
                <div className="flex w-full h-full">
                   <div className="w-1/2 h-full border-r border-[#333] relative">
                      <span className="absolute top-1/2 left-4 px-2 py-1 bg-black/80 text-white/50 text-[10px] font-bold uppercase rounded border border-white/20 -translate-y-1/2 z-10">V{compareVersionIdx + 1}</span>
                      <video 
                        id="compare-video"
                        src={compareVersionUrl}
                        className="w-full h-full object-contain"
                        muted // Mute the compare video to avoid double audio
                      />
                   </div>
                   <div className="w-1/2 h-full relative">
                      <span className="absolute top-1/2 right-4 px-2 py-1 bg-accent/80 text-white text-[10px] font-bold uppercase rounded border border-white/20 -translate-y-1/2 z-10 shadow-lg">V{activeVersionIdx + 1}</span>
                      <video 
                        ref={videoRef}
                        src={currentVersionUrl}
                        className="w-full h-full object-contain"
                        onTimeUpdate={handleTimeUpdate}
                        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                        onEnded={() => setIsPlaying(false)}
                      />
                   </div>
                </div>
              ) : (
                /* NORMAL SINGLE PLAYER */
                currentVersionUrl?.toLowerCase().match(/\.(jpeg|jpg|gif|png|heic|webp)$/) ? (
                  <img src={currentVersionUrl} className="max-h-full max-w-full object-contain" alt="Visualização do arquivo" />
                ) : (
                  <video 
                    ref={videoRef}
                    src={currentVersionUrl}
                    className="max-h-full max-w-full object-contain"
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                    onEnded={() => setIsPlaying(false)}
                  />
                )
              )
            ) : (
               <div className="flex flex-col items-center justify-center text-text-tertiary">
                 <VideoOff className="w-12 h-12 mb-4 opacity-50" />
                 <p className="text-sm">Versão não encontrada</p>
               </div>
            )}
            
            {/* Play/Pause Center Indicator */}
             <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300 ${!isPlaying && showControls ? 'opacity-100' : 'opacity-0'}`}>
                {currentVersionUrl && !currentVersionUrl?.toLowerCase().match(/\.(jpeg|jpg|gif|png|heic|webp)$/) && (
                  <div className="w-20 h-20 rounded-full bg-black/60 backdrop-blur border border-white/10 flex items-center justify-center text-white/90 shadow-2xl">
                    <Play className="w-10 h-10 ml-1.5 fill-current" />
                  </div>
                )}
             </div>
          </div>

          {/* Bottom Controls Bar */}
          <div className={`absolute bottom-0 left-0 right-0 pt-16 pb-2 px-4 bg-gradient-to-t from-black via-black/80 to-transparent transition-opacity duration-300 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'}`}>
            
            {/* Action Bar (Float above controls) */}
            <div className="flex justify-center mb-3">
               <button 
                 onClick={(e) => { e.stopPropagation(); togglePlay(); setActiveTab('comments'); setAttachTimecode(true); setTimeout(()=>commentInputRef.current?.focus(), 100); }}
                 className="px-4 py-1.5 bg-black/80 backdrop-blur rounded-full border border-white/10 text-white text-[11px] font-medium tracking-wide flex items-center gap-2 hover:bg-black hover:border-white/30 transition-all shadow-xl"
               >
                 <MessageSquare className="w-3.5 h-3.5" /> Comentar em <span className="font-mono text-accent">{formatTime(currentTime)}</span> <span className="text-[9px] text-white/40 ml-1">C</span>
               </button>
            </div>

            {/* Scrubber Area */}
            <div 
              className="relative h-5 flex items-center cursor-pointer group/scrubber"
              ref={scrubberContainerRef}
              onClick={(e) => {
                if (!duration) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const pos = (e.clientX - rect.left) / rect.width;
                seekTo(pos * duration);
              }}
              onMouseMove={handleScrubberMouseMove}
              onMouseLeave={() => setHoverTime(null)}
            >
              {/* Background Track */}
              <div className="absolute w-full h-1.5 bg-white/20 rounded-full overflow-hidden transition-all group-hover/scrubber:h-2">
                <div className="h-full bg-accent transition-all duration-[50ms] ease-linear shadow-[0_0_12px_rgba(242,101,34,0.8)]" style={{ width: `${(currentTime / duration) * 100}%` }}></div>
              </div>
              
              {/* Comments Markers on Track */}
              {comments.filter(c => c.timecode_seconds !== null && c.version_idx === activeVersionIdx).map(c => (
                <div 
                  key={c.id} 
                  className={`absolute w-2 h-2 rounded-full border border-[#000] z-10 hover:scale-[2] transition-transform shadow-[0_0_8px_rgba(0,0,0,0.8)] cursor-pointer hover:z-20 ${
                    c.resolved ? 'bg-success opacity-50' : 'bg-warning'
                  }`}
                  style={{ left: `${(c.timecode_seconds / duration) * 100}%`, transform: 'translateX(-50%)' }}
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    seekTo(c.timecode_seconds); 
                    setActiveTab('comments'); 
                    // optional: scroll to comment
                  }}
                />
              ))}

              {/* Hover Tooltip/Tooltip fake thumb */}
              {hoverTime !== null && (
                <div 
                  className="absolute bottom-6 flex flex-col items-center -translate-x-1/2 pointer-events-none"
                  style={{ left: `${hoverPos * 100}%` }}
                >
                  <div className="px-2 py-1 bg-black/90 backdrop-blur rounded text-[10px] font-mono text-white shadow-xl border border-white/20 before:absolute before:-bottom-1 before:left-1/2 before:-translate-x-1/2 before:w-2 before:h-2 before:bg-black/90 before:border-r before:border-b before:border-white/20 before:rotate-45">
                    {formatTime(hoverTime)}
                  </div>
                </div>
              )}
            </div>

            {/* Play controls bottom bar */}
            <div className="flex items-center justify-between mt-2 text-white px-1">
               <div className="flex items-center gap-4">
                 <button onClick={togglePlay} className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded transition-colors text-white outline-none">
                   {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                 </button>
                 <div className="font-mono text-[11px] text-white/90 tracking-wider">
                   {formatTime(currentTime)} <span className="opacity-40 mx-1">/</span> {formatTime(duration)}
                 </div>
               </div>
               <div className="flex items-center gap-3">
                  <select 
                     value={playbackRate}
                     onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setPlaybackRate(val);
                        if(videoRef.current) videoRef.current.playbackRate = val;
                        if(compareMode) { const v = document.getElementById('compare-video') as HTMLVideoElement; if(v) v.playbackRate = val; }
                     }}
                     className="bg-transparent border-none text-[11px] font-mono font-bold hover:bg-white/10 py-1 px-1 rounded cursor-pointer outline-none appearance-none"
                  >
                     <option className="text-black" value="0.5">0.5x</option>
                     <option className="text-black" value="1">1.0x</option>
                     <option className="text-black" value="1.25">1.25x</option>
                     <option className="text-black" value="1.5">1.5x</option>
                     <option className="text-black" value="2">2.0x</option>
                  </select>
                  <button onClick={toggleFullscreen} className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded transition-colors text-white outline-none">
                    <Maximize className="w-4 h-4" />
                  </button>
               </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: TABS */}
        <div className="w-full lg:w-[40%] flex flex-col bg-bg-surface border-l border-border-default min-w-[320px]">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <div className="px-1 md:px-0 border-b border-border-default bg-bg-surface-elevated shrink-0 relative overflow-x-auto custom-scrollbar">
              <TabsList className="bg-transparent justify-start h-[42px] p-0 w-max min-w-full">
                <TabsTrigger value="comments" className="text-[10px] md:text-[11px] font-bold uppercase tracking-widest text-text-secondary data-[state=active]:text-accent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 border-accent rounded-none h-full px-4 border-transparent flex gap-1.5 transition-colors">
                  Comentários {unresolvedComments > 0 && <span className="bg-warning text-warning-foreground font-black px-1.5 py-0.5 rounded-full text-[9px] leading-none mb-[1px]">{unresolvedComments}</span>}
                </TabsTrigger>
                <TabsTrigger value="briefing" className="text-[10px] md:text-[11px] font-bold uppercase tracking-widest text-text-secondary data-[state=active]:text-accent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 border-accent rounded-none h-full px-4 border-transparent transition-colors">
                  Briefing
                </TabsTrigger>
                <TabsTrigger value="pipeline" className="text-[10px] md:text-[11px] font-bold uppercase tracking-widest text-text-secondary data-[state=active]:text-accent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 border-accent rounded-none h-full px-4 border-transparent transition-colors">
                  Pipeline
                </TabsTrigger>
                <TabsTrigger value="raw" className="text-[10px] md:text-[11px] font-bold uppercase tracking-widest text-text-secondary data-[state=active]:text-accent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 border-accent rounded-none h-full px-4 border-transparent transition-colors">
                  Brutos
                </TabsTrigger>
                <TabsTrigger value="details" className="text-[10px] md:text-[11px] font-bold uppercase tracking-widest text-text-secondary data-[state=active]:text-accent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 border-accent rounded-none h-full px-4 border-transparent transition-colors">
                  Detalhes
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 min-h-0 relative bg-bg-base/50">
               
               {/* TAB: COMMENTS */}
               <TabsContent value="comments" className="m-0 absolute inset-0 flex flex-col outline-none">
                  {/* Comments List */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-6 space-y-5">
                     {comments.filter(c => c.version_idx === activeVersionIdx).length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-text-tertiary">
                           <MessageSquare className="w-12 h-12 opacity-20 mb-3" />
                           <p className="text-sm font-medium text-text-secondary">Nenhum comentário na V{activeVersionIdx + 1}</p>
                           <p className="text-xs max-w-[200px] text-center mt-1">Clique no botão flutuante no player ou pressione C para comentar.</p>
                        </div>
                     ) : (
                        <AnimatePresence>
                           {comments.filter(c => c.version_idx === activeVersionIdx).map(comment => (
                             <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={comment.id} className={`flex gap-3 group relative rounded-lg p-3 -mx-3 border-l-2 transition-colors hover:bg-bg-surface ${comment.resolved ? 'border-success/30 opacity-70' : 'border-transparent'}`}>
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 bg-gradient-to-br from-bg-surface-elevated to-bg-surface-active shadow-inner border border-white/5 uppercase" style={{ backgroundColor: '#2C2D31' }}>
                                   {comment.author_name.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-wrap items-baseline gap-1.5 mb-1 text-xs">
                                     <span className="font-bold text-text-primary">{comment.author_name}</span>
                                     <span className="text-text-tertiary">•</span>
                                     <span className="text-text-tertiary font-medium">{formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ptBR })}</span>
                                     {comment.timecode_seconds !== null && (
                                       <button 
                                         onClick={() => seekTo(comment.timecode_seconds)} 
                                         className="ml-auto inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider bg-accent-subtle text-accent border border-accent/20 hover:bg-accent hover:text-white transition-colors"
                                       >
                                         <CornerDownRight className="w-2.5 h-2.5" /> {formatTime(comment.timecode_seconds)}
                                       </button>
                                     )}
                                  </div>
                                  <div className="text-[13px] text-text-secondary leading-relaxed whitespace-pre-wrap">{comment.text}</div>
                                  
                                  {/* Actions Footer */}
                                  <div className="mt-3 flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100">
                                     {!comment.resolved ? (
                                        <>
                                          <button 
                                            onClick={() => toggleResolveComment(comment.id, false)}
                                            className="text-[10px] font-bold uppercase tracking-wider text-text-secondary hover:text-success transition-colors flex items-center gap-1"
                                          >
                                            <CheckCircle2 className="w-3.5 h-3.5" /> Resolver
                                          </button>
                                          <button className="text-[10px] font-bold uppercase tracking-wider text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1">
                                            Responder
                                          </button>
                                        </>
                                     ) : (
                                        <div className="flex items-center justify-between w-full">
                                          <span className="px-2 py-0.5 rounded-full bg-success/10 text-success text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 border border-success/20">
                                            <CheckCircle2 className="w-3 h-3" /> Resolvido por {comment.resolved_by || 'Unknown'}
                                          </span>
                                          <button onClick={() => toggleResolveComment(comment.id, true)} className="text-[10px] font-bold uppercase tracking-wider text-text-secondary hover:text-warning transition-colors">
                                             Reabrir
                                          </button>
                                        </div>
                                     )}
                                  </div>
                                </div>
                             </motion.div>
                           ))}
                        </AnimatePresence>
                     )}
                  </div>

                  {/* Comment Input Footer */}
                  <div className="shrink-0 p-4 bg-bg-surface border-t border-border-default shadow-[0_-4px_24px_rgba(0,0,0,0.1)] z-10 w-full mb-1 lg:mb-0">
                     <div className="bg-bg-surface-elevated border border-border-default rounded-xl focus-within:border-accent focus-within:ring-1 focus-within:ring-accent/50 transition-all flex flex-col p-1.5 shadow-sm">
                        <textarea
                           ref={commentInputRef}
                           value={commentText}
                           onChange={e => setCommentText(e.target.value)}
                           onKeyDown={(e) => {
                             if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submitComment(); }
                           }}
                           placeholder="Nova alteração pedida, dúvida, ou comentário geral..."
                           className="w-full bg-transparent text-[13px] text-text-primary placeholder:text-text-tertiary resize-none min-h-[60px] max-h-[160px] outline-none p-2 custom-scrollbar"
                        />
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border-subtle">
                           <label className="flex items-center gap-2 cursor-pointer px-2 py-1.5 rounded hover:bg-bg-surface-active transition-colors font-mono text-[10px]">
                              <input type="checkbox" checked={attachTimecode} onChange={e => setAttachTimecode(e.target.checked)} className="rounded border-border-strong bg-transparent accent-accent" />
                              <span className="text-text-tertiary">Anexar</span>
                              <span className="bg-bg-base border border-border-default px-1.5 py-0.5 rounded text-accent font-bold shadow-sm">{formatTime(currentTime)}</span>
                           </label>
                           <Button 
                             onClick={submitComment} 
                             disabled={!commentText.trim()} 
                             className="h-8 text-xs font-bold uppercase tracking-wider bg-accent hover:bg-accent-hover text-white px-5 shadow-[0_2px_8px_rgba(242,101,34,0.3)] disabled:opacity-50"
                           >
                             Enviar
                           </Button>
                        </div>
                     </div>
                     <div className="text-center mt-3 text-[10px] text-text-tertiary">
                       <span className="font-mono bg-bg-surface-elevated px-1 py-0.5 rounded">Cmd</span> + <span className="font-mono bg-bg-surface-elevated px-1 py-0.5 rounded">Enter</span> para enviar
                     </div>
                  </div>
               </TabsContent>

               {/* TAB: BRIEFING */}
               <TabsContent value="briefing" className="m-0 absolute inset-0 flex flex-col outline-none">
                 <div className="px-5 py-4 border-b border-border-subtle bg-bg-surface shrink-0 flex items-center justify-between">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-text-secondary flex items-center gap-2"><FileVideo className="w-4 h-4"/> Instruções de Edição</h3>
                    {appUser?.role !== 'viewer' && (
                      <div className="flex items-center gap-3">
                         <span className="text-[10px] text-text-tertiary font-mono italic">{saveIndicator}</span>
                         <Button variant="outline" size="sm" onClick={() => setIsEditingBriefing(!isEditingBriefing)} className="h-7 text-xs bg-bg-surface border-border-default gap-1.5">
                            {isEditingBriefing ? 'Feito' : 'Editar Briefing'}
                         </Button>
                      </div>
                    )}
                 </div>
                 <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-bg-base/50">
                   {isEditingBriefing ? (
                      <textarea
                        value={briefingText}
                        onChange={(e) => setBriefingText(e.target.value)}
                        className="w-full min-h-[400px] h-full bg-bg-surface border border-border-default rounded-xl p-4 text-[13px] text-text-primary font-mono leading-relaxed outline-none focus:border-accent focus:ring-1 focus:ring-accent/50 resize-none shadow-sm"
                        placeholder="# Briefing do Vídeo\n\n- Tema:\n- Direção de arte:\n..."
                      />
                   ) : (
                      <div className="markdown-body bg-bg-surface border border-border-default rounded-xl p-6 shadow-sm min-h-full">
                         {briefingText ? (
                            <ReactMarkdown>{briefingText}</ReactMarkdown>
                         ) : (
                            <div className="flex flex-col items-center justify-center text-text-tertiary mt-20">
                              <FileVideo className="w-12 h-12 mb-4 opacity-20" />
                              <p className="text-sm">Nenhum briefing vinculado.</p>
                              {appUser?.role !== 'viewer' && <Button onClick={() => setIsEditingBriefing(true)} variant="link" className="text-accent mt-2">Adicionar agora</Button>}
                            </div>
                         )}
                      </div>
                   )}
                 </div>
               </TabsContent>

               {/* TAB: PIPELINE */}
               <TabsContent value="pipeline" className="m-0 absolute inset-0 outline-none overflow-y-auto custom-scrollbar p-6">
                 <div className="relative pl-3">
                   <div className="absolute left-[19px] top-4 bottom-4 w-px bg-border-strong border-dashed border-l"></div>
                   
                   <div className="space-y-6">
                     {pipelineLogs.map((log, i) => (
                       <div key={log.id} className="relative z-10 flex gap-4 items-start">
                         {/* Dot marker */}
                         <div className="w-4 h-4 rounded-full border-2 border-bg-base shrink-0 mt-1 shadow-sm flex items-center justify-center overflow-hidden" 
                           style={{ backgroundColor: COLUMNS.find(c => c.id === log.to_status)?.color?.split(' ')[0]?.replace('bg-', '') || '#8B8D98' }}>
                           <div className="w-1 h-1 bg-white rounded-full"></div>
                         </div>
                         
                         <div className="flex flex-col bg-bg-surface border border-border-default p-3.5 rounded-xl shadow-sm text-[13px] text-text-primary flex-1 group hover:-translate-y-px transition-transform hover:border-border-strong">
                           <p className="leading-snug">
                             <strong className="font-bold">{log.user_name}</strong> mudou para 
                             <span className={`mx-1.5 px-2 py-0.5 rounded text-[9px] uppercase font-bold tracking-widest ${COLUMNS.find(c => c.id === log.to_status)?.color || 'bg-bg-surface-elevated border'}`}>
                               {COLUMNS.find(c => c.id === log.to_status)?.label || log.to_status}
                             </span>
                           </p>
                           <span className="text-[10px] text-text-tertiary mt-1.5 font-mono">{log.created_at ? format(log.created_at.toDate(), "dd MMM 'às' HH:mm", {locale: ptBR}) : ''}</span>
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>
               </TabsContent>

               {/* TAB: BRUTOS */}
               <TabsContent value="raw" className="m-0 absolute inset-0 outline-none overflow-y-auto custom-scrollbar p-6">
                 <div className="space-y-4">
                   {video.raw_files && video.raw_files.length > 0 ? (
                     video.raw_files.map((file: any, index: number) => (
                       <div key={index} className="flex items-center justify-between bg-bg-surface border border-border-default p-4 rounded-xl shadow-sm group hover:border-border-strong transition-all">
                         <div className="flex items-center gap-4 overflow-hidden">
                           <div className="w-10 h-10 rounded-lg bg-bg-surface-active flex items-center justify-center shrink-0 text-text-tertiary">
                             <Video className="w-5 h-5" />
                           </div>
                           <div className="flex flex-col min-w-0">
                             <span className="text-sm font-medium text-text-primary truncate">{file.name || `Raw_File_${index}.mp4`}</span>
                             <span className="text-[10px] font-mono text-text-tertiary uppercase tracking-wider">{file.size ? (file.size / (1024*1024)).toFixed(0) + ' MB' : 'Desconhecido'}</span>
                           </div>
                         </div>
                         <div className="flex items-center gap-2">
                           <Button onClick={() => setActiveRawFile(file)} variant="outline" className="hidden sm:flex h-8 px-3 bg-bg-surface-elevated border-border-default text-text-secondary hover:text-text-primary rounded-md text-xs">
                             <Play className="w-4 h-4 mr-1.5" /> Ver
                           </Button>
                           <Button variant="outline" className="shrink-0 h-8 w-8 p-0 bg-bg-surface-elevated border-border-default text-text-secondary hover:text-text-primary rounded-md">
                             <Download className="w-4 h-4" />
                           </Button>
                         </div>
                       </div>
                     ))
                   ) : (
                     <div className="flex flex-col items-center justify-center py-20 text-text-tertiary">
                       <Download className="w-10 h-10 opacity-20 mb-4" />
                       <p className="text-sm">Nenhum bruto associado.</p>
                     </div>
                   )}
                 </div>
               </TabsContent>
               
               {/* TAB: DETAILS */}
               <TabsContent value="details" className="m-0 absolute inset-0 outline-none overflow-y-auto custom-scrollbar p-6">
                 <div className="bg-bg-surface border border-border-default rounded-xl p-5 shadow-sm space-y-6">
                   <div>
                     <span className="text-[10px] uppercase font-bold tracking-widest text-text-tertiary block mb-2">Cliente</span>
                     <div className="text-sm font-medium text-text-primary flex items-center gap-2">
                       {client ? (
                         <><div className="w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center text-[9px] font-bold">{client.name.charAt(0)}</div> {client.name}</>
                       ) : 'Carregando...'}
                     </div>
                   </div>
                   
                   <div>
                     <span className="text-[10px] uppercase font-bold tracking-widest text-text-tertiary block mb-2">Editor Designado</span>
                     {editor ? (
                         <div className="text-sm font-medium text-text-primary flex items-center gap-2">
                           <div className="w-5 h-5 rounded-full bg-bg-surface-elevated border border-border-default flex items-center justify-center text-[9px] font-bold text-text-secondary"><User className="w-3 h-3" /></div>
                           {editor.name}
                         </div>
                     ) : (
                         <div className="text-sm italic text-text-tertiary">Nenhum editor atribuído.</div>
                     )}
                   </div>
                   
                   <div>
                     <span className="text-[10px] uppercase font-bold tracking-widest text-text-tertiary block mb-2">Plataforma</span>
                     <Badge variant="outline" className="bg-bg-surface border-border-default text-text-secondary uppercase tracking-widest">{video.platform || 'REELS'}</Badge>
                   </div>

                   <div>
                     <span className="text-[10px] uppercase font-bold tracking-widest text-text-tertiary block mb-2">Link da Publicação</span>
                     {video.published_url ? (
                        <a href={video.published_url} target="_blank" rel="noreferrer" className="text-sm text-accent hover:underline flex items-center gap-1.5 break-all">
                           {video.published_url} <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                     ) : (
                        <p className="text-sm italic text-text-tertiary">Ainda não publicado.</p>
                     )}
                   </div>
                 </div>
               </TabsContent>

            </div>
          </Tabs>
        </div>
      </div>
    </PageTransition>
  );
}
