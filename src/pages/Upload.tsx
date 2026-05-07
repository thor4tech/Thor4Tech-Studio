import { useState, useEffect } from "react";
import { collection, query, getDocs, setDoc, doc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { toast } from "sonner";
import { UploadCloud, CheckCircle2, Loader2, Video as VideoIcon, FileText, Smartphone, MonitorPlay, Check, LayoutTemplate, BriefcaseBusiness } from "lucide-react";
import PageTransition from "../components/PageTransition";
import { motion, AnimatePresence } from "motion/react";
import heic2any from "heic2any";

const PLATFORMS = [
  { id: 'reels', label: 'Reels / TikTok', icon: Smartphone },
  { id: 'youtube', label: 'YouTube Longo', icon: MonitorPlay },
  { id: 'shorts', label: 'YT Shorts', icon: Smartphone },
];

function PreviewThumb({ file }: { file: File }) {
  const [src, setSrc] = useState<string>("");

  useEffect(() => {
    let objectUrl = "";
    if (file.name.toLowerCase().endsWith(".heic")) {
      heic2any({ blob: file, toType: "image/jpeg" })
        .then((conversionResult) => {
          const blob = Array.isArray(conversionResult) ? conversionResult[0] : conversionResult;
          objectUrl = URL.createObjectURL(blob);
          setSrc(objectUrl);
        })
        .catch((e) => {
          console.error("heic2any erro:", e);
        });
    } else {
      objectUrl = URL.createObjectURL(file);
      setSrc(objectUrl);
    }
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  if (!src) {
    return <Loader2 className="w-4 h-4 animate-spin group-hover:text-accent transition-colors" />;
  }

  if (file.type.startsWith("image/") || file.name.toLowerCase().match(/\.(heic|jpeg|jpg|gif|png|webp)$/)) {
    return <img src={src} alt={file.name} className="w-full h-full object-cover" />;
  }
  if (file.type.startsWith("video/") || file.name.toLowerCase().match(/\.(mp4|mov|mxf|avi)$/)) {
    return <video src={src} className="w-full h-full object-cover" muted playsInline />;
  }
  return <VideoIcon className="w-5 h-5 group-hover:text-accent transition-colors" />;
}

export default function Upload() {
  const [clients, setClients] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    client_id: '',
    title: '',
    theme: '',
    duration_target_seconds: 60,
    platform: 'reels',
    briefing: ''
  });
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    getDocs(query(collection(db, "clients"))).then(snap => {
      setClients(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files!)]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client_id || !formData.title || files.length === 0) {
      toast.error("Preencha os campos obrigatórios e selecione arquivos");
      return;
    }

    setUploading(true);
    setProgress(10);
    try {
      const client = clients.find(c => c.id === formData.client_id);
      const videoId = crypto.randomUUID();
      const raw_files = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const key = `clients/${client.slug}/raw/${videoId}/${file.name}`;
        
        // MOCK: Replace with real URL fetch in production
        // const res = await fetch("/api/b2/getUploadUrl", { ... });
        await new Promise(r => setTimeout(r, 600)); // Simulating upload time
        
        raw_files.push({
          key,
          name: file.name,
          size: file.size,
          uploaded_at: new Date().toISOString()
        });

        setProgress(10 + Math.floor(((i + 1) / files.length) * 80));
      }

      await setDoc(doc(db, "videos", videoId), {
        ...formData,
        id: videoId,
        client_slug: client.slug,
        status: 'raw_received',
        raw_files,
        versions: [],
        references: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      toast.success("Upload concluído com sucesso!");
      setFormData({ client_id: '', title: '', theme: '', duration_target_seconds: 60, platform: 'reels', briefing: '' });
      setFiles([]);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro durante o upload");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <PageTransition className="h-full flex flex-col bg-bg-base overflow-hidden">
      {/* HEADER FIXED */}
      <div className="flex items-center justify-between border-b border-border-subtle p-6 bg-bg-surface-elevated z-10 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Novo Projeto</h1>
          <p className="text-xs text-text-secondary mt-1 uppercase tracking-widest font-medium">Configure os detalhes e envie os arquivos brutos</p>
        </div>
        <Button 
          onClick={handleUpload} 
          disabled={uploading || files.length === 0 || !formData.title || !formData.client_id} 
          className="bg-accent hover:bg-accent-hover text-white h-10 px-6 font-semibold shadow-[0_2px_12px_rgba(242,101,34,0.3)] transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
        >
          {uploading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processando {progress}%</>
          ) : (
            <><UploadCloud className="w-4 h-4 mr-2" /> Iniciar Upload</>
          )}
        </Button>
      </div>

      {/* SPLIT CONTENT */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        
        {/* LEFT PANEL: CONFIGURATION */}
        <div className="w-full lg:w-[45%] flex flex-col bg-bg-surface border-r border-border-subtle overflow-y-auto custom-scrollbar p-8 space-y-8">
          
          <div className="space-y-6">
            <h2 className="text-sm font-semibold flex items-center gap-2 text-text-primary border-b border-border-default pb-2">
              <BriefcaseBusiness className="w-4 h-4 text-accent" /> 1. Cliente & Plataforma
            </h2>
            
            <div className="space-y-2">
              <Label className="text-[11px] text-text-secondary uppercase tracking-[0.08em] font-medium">Cliente</Label>
              <div className="grid grid-cols-2 gap-3">
                {clients.map(c => (
                  <div 
                    key={c.id} 
                    onClick={() => setFormData({...formData, client_id: c.id})}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${formData.client_id === c.id ? 'border-accent bg-accent-subtle shadow-[0_0_10px_rgba(242,101,34,0.1)]' : 'border-border-default bg-bg-base hover:border-border-strong hover:bg-bg-surface-elevated'}`}
                  >
                    <div className="w-6 h-6 rounded bg-bg-surface-elevated flex items-center justify-center text-[10px] font-bold text-white shadow-sm" style={{ backgroundColor: c.brand_color }}>
                      {c.name.charAt(0)}
                    </div>
                    <span className={`text-sm font-medium ${formData.client_id === c.id ? 'text-accent' : 'text-text-primary'}`}>{c.name}</span>
                    {formData.client_id === c.id && <CheckCircle2 className="w-4 h-4 text-accent ml-auto" />}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-2">
               <Label className="text-[11px] text-text-secondary uppercase tracking-[0.08em] font-medium">Plataforma / Formato</Label>
               <div className="flex flex-wrap gap-3">
                  {PLATFORMS.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setFormData({...formData, platform: p.id})}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm transition-all font-medium ${formData.platform === p.id ? 'border-accent bg-accent-subtle text-accent shadow-[0_0_10px_rgba(242,101,34,0.1)]' : 'border-border-default bg-bg-base text-text-secondary hover:border-border-strong hover:text-text-primary'}`}
                    >
                      <p.icon className="w-4 h-4" />
                      {p.label}
                    </button>
                  ))}
               </div>
            </div>
          </div>

          <div className="space-y-6 pt-4">
            <h2 className="text-sm font-semibold flex items-center gap-2 text-text-primary border-b border-border-default pb-2">
              <LayoutTemplate className="w-4 h-4 text-accent" /> 2. Detalhes do Projeto
            </h2>

            <div className="space-y-2">
              <Label className="text-[11px] text-text-secondary uppercase tracking-[0.08em] font-medium">Nome do Vídeo</Label>
              <Input 
                required 
                value={formData.title} 
                onChange={e => setFormData({...formData, title: e.target.value})}
                className="bg-bg-base border-border-default focus:border-accent text-base h-12 shadow-sm font-medium" 
                placeholder="Ex VLOG Dubai - Dia 1..."
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-end">
                 <Label className="text-[11px] text-text-secondary uppercase tracking-[0.08em] font-medium">Briefing & Roteiro</Label>
                 <span className="text-[10px] bg-bg-surface-elevated border border-border-default px-1.5 py-0.5 rounded text-text-tertiary">Suporta Markdown</span>
              </div>
              <Textarea 
                value={formData.briefing} 
                onChange={e => setFormData({...formData, briefing: e.target.value})}
                className="bg-bg-base border-border-default focus:border-accent min-h-[160px] resize-y text-[13px] leading-relaxed shadow-sm custom-scrollbar placeholder:text-text-tertiary/50" 
                placeholder="# Hook&#10;- Aquele gancho incrível...&#10;&#10;# Estrutura..."
              />
            </div>
          </div>

        </div>

        {/* RIGHT PANEL: UPLOAD ZONE */}
        <div className="w-full lg:w-[55%] flex flex-col p-8 bg-bg-base h-full relative">
          <h2 className="text-sm font-semibold flex items-center gap-2 text-text-primary border-b border-border-subtle pb-2 mb-6">
            <VideoIcon className="w-4 h-4 text-accent" /> 3. Arquivos Brutos
          </h2>

          <div 
            className={`flex-1 min-h-[300px] border-2 border-dashed rounded-2xl flex flex-col transition-all duration-300 relative overflow-hidden ${
              isDragging ? 'border-accent bg-accent/5 scale-[1.01] shadow-[0_0_30px_rgba(242,101,34,0.1)] z-10' : 
              files.length > 0 ? 'border-border-default bg-bg-surface/50' : 'border-border-strong bg-bg-surface hover:bg-bg-surface-elevated hover:border-border-strong/80'
            }`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <Input 
              type="file" 
              multiple 
              accept="video/mp4,video/quicktime,video/x-m4v,video/*,image/heic"
              onChange={handleFileChange} 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
            />
            
            {files.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center text-center p-10 pointer-events-none">
                <motion.div animate={{ y: isDragging ? -10 : 0, scale: isDragging ? 1.1 : 1 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-colors ${isDragging ? 'bg-accent/20 text-accent' : 'bg-bg-surface-elevated text-text-tertiary border border-border-default shadow-sm'}`}>
                    <UploadCloud className="w-10 h-10" />
                  </div>
                </motion.div>
                <h3 className="text-lg font-bold text-text-primary mb-2">Arraste seus vídeos para cá</h3>
                <p className="text-sm text-text-secondary max-w-sm leading-relaxed mb-6">
                  Suportamos .mp4, .mov, .mxf e mais. Os arquivos serão enviados diretamente para nosso storage seguro.
                </p>
                <Button type="button" variant="outline" className="border-border-default bg-bg-base pointer-events-auto shadow-sm">
                  Procurar arquivos
                </Button>
              </div>
            ) : (
              <div className="flex flex-col h-full z-20 pointer-events-auto">
                {/* Header of file list */}
                <div className="flex items-center justify-between p-4 border-b border-border-subtle bg-bg-surface-elevated shrink-0">
                   <h4 className="text-sm font-semibold text-text-primary flex items-center">
                     <CheckCircle2 className="w-4 h-4 text-success mr-2" />
                     {files.length} arquivo(s) preparado(s)
                   </h4>
                   <span className="text-[11px] text-text-tertiary font-mono">
                     {((files.reduce((acc, f) => acc + f.size, 0)) / (1024*1024)).toFixed(1)} MB total
                   </span>
                </div>
                
                {/* File list scrollable */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
                  <AnimatePresence>
                    {files.map((f, i) => (
                      <motion.div 
                        initial={{ opacity: 0, x: 20 }} 
                        animate={{ opacity: 1, x: 0 }} 
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: i * 0.03 }}
                        key={`${f.name}-${i}`} 
                        className="bg-bg-base border border-border-default p-3 rounded-xl flex items-center justify-between shadow-sm group hover:border-border-strong"
                      >
                         <div className="flex items-center gap-3 overflow-hidden">
                           <div className="w-12 h-12 rounded bg-bg-surface flex items-center justify-center shrink-0 border border-border-subtle text-text-tertiary overflow-hidden group-hover:border-accent/50 transition-colors">
                             <PreviewThumb file={f} />
                           </div>
                           <div className="flex flex-col min-w-0">
                             <span className="text-[13px] text-text-primary font-medium truncate">{f.name}</span>
                             <span className="text-[10px] text-text-tertiary uppercase tracking-widest font-mono">{(f.size / (1024*1024)).toFixed(1)} MB</span>
                           </div>
                         </div>
                         <button 
                           type="button" 
                           onClick={() => removeFile(i)}
                           className="w-8 h-8 flex items-center justify-center rounded-lg text-text-tertiary hover:text-danger hover:bg-danger-subtle transition-colors shrink-0"
                         >
                           &times;
                         </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {uploading && (
                  <div className="p-6 border-t border-border-subtle bg-bg-surface-elevated shrink-0">
                    <div className="flex justify-between items-baseline mb-2">
                      <span className="text-xs font-semibold text-text-primary animate-pulse flex items-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
                        Fazendo upload ultra-rápido...
                      </span>
                      <span className="text-sm font-mono text-accent font-bold">{progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-bg-base rounded-full overflow-hidden border border-border-default inset-shadow-sm">
                      <div className="h-full bg-accent transition-all duration-300 ease-out shadow-[0_0_12px_rgba(242,101,34,0.6)]" style={{ width: `${progress}%` }}></div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Drop Overlay when files are present but dragging new ones */}
            {files.length > 0 && isDragging && (
              <div className="absolute inset-0 bg-accent/10 backdrop-blur-sm z-30 flex items-center justify-center border-2 border-accent border-dashed m-1 rounded-xl">
                 <div className="bg-bg-surface p-4 rounded-xl shadow-xl flex items-center gap-3">
                   <UploadCloud className="w-6 h-6 text-accent" />
                   <span className="font-semibold text-text-primary">Solte para adicionar mais</span>
                 </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
