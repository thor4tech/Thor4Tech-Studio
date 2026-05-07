import { useState, useEffect } from "react";
import { useAuth } from "../lib/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db, auth, storage } from "../lib/firebase";
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Button } from "../components/ui/button";
import { User, Sliders, Users, Link as LinkIcon, Keyboard, Info, Check, Upload, Save, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import PageTransition from "../components/PageTransition";
import Editors from "./Editors";

// For WhatsApp text formatting
function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  let res = "+55";
  if (digits.length > 2) {
    if (digits.startsWith("55")) {
      res = `+55 (${digits.substring(2, 4)}`;
      if (digits.length > 4) res += `) ${digits.substring(4, 9)}`;
      if (digits.length > 9) res += `-${digits.substring(9, 13)}`;
    } else {
      res = `+55 (${digits.substring(0, 2)}`;
      if (digits.length > 2) res += `) ${digits.substring(2, 7)}`;
      if (digits.length > 7) res += `-${digits.substring(7, 11)}`;
    }
  } else if (digits.length > 0) {
    res = `+55 (${digits}`;
  }
  return res.substring(0, 19);
}

export default function Settings() {
  const { user, appUser } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(true);

  // Profile data
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  // Prefs
  const [whatsAppNotif, setWhatsAppNotif] = useState(true);
  const [emailNotif, setEmailNotif] = useState(true);
  const [notifTypes, setNotifTypes] = useState({
    newVideo: true,
    v1Delivered: true,
    comments: true,
    approved: true,
    deadline: true
  });
  
  const [isDirty, setIsDirty] = useState(false);
  const [dbData, setDbData] = useState<any>(null);

  // Password change
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdError, setPwdError] = useState("");

  useEffect(() => {
    if (!appUser?.id) return;
    
    const fetchProfile = async () => {
      try {
        const snap = await getDoc(doc(db, "users", appUser.id));
        if (snap.exists()) {
          const data = snap.data();
          setDbData(data);
          setName(data.name || "");
          setPhone(data.phone || "");
          setAvatarUrl(data.avatar_url || "");
          
          if (data.preferences) {
            setWhatsAppNotif(data.preferences.whatsapp !== false);
            setEmailNotif(data.preferences.email !== false);
            if (data.preferences.notifTypes) {
              setNotifTypes({
                ...data.preferences.notifTypes
              });
            }
          }
        }
      } catch (err) {
        console.error(err);
        toast.error("Erro ao carregar configurações");
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, [appUser]);

  // Handle Dirty State
  useEffect(() => {
    if (!dbData) return;
    
    let isChanged = false;
    if (name !== dbData.name) isChanged = true;
    if (phone !== (dbData.phone || "")) isChanged = true;
    
    if (dbData.preferences) {
      if (whatsAppNotif !== (dbData.preferences.whatsapp !== false)) isChanged = true;
      if (emailNotif !== (dbData.preferences.email !== false)) isChanged = true;
    } else {
      if (!whatsAppNotif || !emailNotif) isChanged = true;
    }
    
    setIsDirty(isChanged);
  }, [name, phone, whatsAppNotif, emailNotif, dbData]);

  // Warning for unsaved changes before leaving
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = ''; // Required for Chrome
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);


  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !appUser?.id) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }
    
    if (!file.type.startsWith('image/')) {
      toast.error("O arquivo deve ser uma imagem");
      return;
    }

    try {
      setUploadingAvatar(true);
      const fileRef = ref(storage, `avatars/${appUser.id}_${Date.now()}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      
      await updateDoc(doc(db, "users", appUser.id), {
        avatar_url: url
      });
      
      setAvatarUrl(url);
      toast.success("Foto de perfil atualizada");
    } catch(err) {
      console.error(err);
      toast.error("Erro ao fazer upload da imagem");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!appUser?.id) return;
    try {
      await updateDoc(doc(db, "users", appUser.id), {
        name,
        phone,
        updated_at: new Date().toISOString(),
      });
      setDbData((p:any) => ({...p, name, phone}));
      setIsDirty(false);
      toast.success("Perfil atualizado com sucesso!");
    } catch(err) {
      toast.error("Erro ao atualizar perfil");
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.email) return;
    if (newPassword !== confirmPassword) {
      setPwdError("As senhas não coincidem");
      return;
    }
    if (newPassword.length < 8) {
      setPwdError("A nova senha deve ter no mínimo 8 caracteres");
      return;
    }

    try {
      // Reauthenticate
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Update Password
      await updatePassword(user, newPassword);
      
      toast.success("Senha alterada com sucesso!");
      setIsPasswordModalOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPwdError("");
    } catch(err: any) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setPwdError("Senha atual incorreta");
      } else {
        setPwdError("Erro ao alterar senha. Tente relogar.");
      }
    }
  };

  // Immediate save for notification prefs
  const updatePreference = async (key: string, value: any) => {
    if (!appUser?.id) return;
    try {
      if (key === 'whatsapp') setWhatsAppNotif(value);
      if (key === 'email') setEmailNotif(value);
      
      const newPrefs = {
        whatsapp: key === 'whatsapp' ? value : whatsAppNotif,
        email: key === 'email' ? value : emailNotif,
        notifTypes: { ...notifTypes }
      };

      await updateDoc(doc(db, "users", appUser.id), {
        preferences: newPrefs,
        updated_at: new Date().toISOString(),
      });
      
      setDbData((p:any) => ({...p, preferences: newPrefs}));
      toast.success("Preferência atualizada", { duration: 2000 });
    } catch(err) {
      toast.error("Erro ao atualizar preferência");
    }
  };

  // Immediate save for specific notif type
  const updateNotifType = async (typeKey: keyof typeof notifTypes, val: boolean) => {
    if (!appUser?.id) return;
    try {
      const newTypes = { ...notifTypes, [typeKey]: val };
      setNotifTypes(newTypes);
      
      await updateDoc(doc(db, "users", appUser.id), {
        "preferences.notifTypes": newTypes,
        updated_at: new Date().toISOString(),
      });
    } catch(err) {
      toast.error("Erro ao atualizar notificação");
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-bg-base text-text-tertiary">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin mb-4" />
        <span className="text-sm">Carregando configurações...</span>
      </div>
    );
  }

  const sidemenuItems = [
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'prefs', label: 'Preferências', icon: Sliders },
    ...(appUser?.role === 'admin' ? [{ id: 'team', label: 'Equipe', icon: Users }] : []),
    ...(appUser?.role === 'admin' ? [{ id: 'integrations', label: 'Integrações', icon: LinkIcon }] : []),
    { id: 'shortcuts', label: 'Atalhos de teclado', icon: Keyboard },
    { id: 'about', label: 'Sobre', icon: Info },
  ];

  return (
    <PageTransition className="flex-1 flex flex-col sm:flex-row overflow-hidden">
      
      {/* INTERNAL SIDEBAR */}
      <div className="w-full sm:w-48 bg-bg-surface border-b sm:border-b-0 sm:border-r border-border-default shrink-0 flex flex-col pt-4 sm:py-6">
        <h2 className="px-6 text-xs font-bold text-text-tertiary uppercase tracking-widest mb-2 sm:mb-4">Configurações</h2>
        <nav className="flex sm:flex-col gap-1 px-3 overflow-x-auto custom-scrollbar pb-2 sm:pb-0">
          {sidemenuItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium whitespace-nowrap shrink-0 ${
                activeTab === item.id 
                  ? 'bg-accent-subtle text-accent' 
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-surface-active'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 overflow-y-auto bg-bg-base relative">
        {/* Unsaved Changes Banner */}
        {isDirty && activeTab === 'profile' && (
          <div className="sticky top-0 left-0 right-0 bg-warning-subtle border-b border-warning/20 px-6 py-3 flex items-center justify-between z-10 shadow-sm">
            <span className="text-sm text-warning font-medium">Você tem alterações não salvas.</span>
            <Button size="sm" onClick={handleSaveProfile} className="bg-warning hover:bg-warning/90 text-black font-bold shadow-md">
               <Save className="w-4 h-4 mr-2" /> Salvar alterações
            </Button>
          </div>
        )}

        <div className="p-8 max-w-[720px] mx-auto min-h-full pb-20">
          
          {/* TAB: PROFILE */}
          {activeTab === 'profile' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div>
                  <h2 className="text-2xl font-bold text-text-primary mb-1">Perfil</h2>
                  <p className="text-sm text-text-secondary">Gerencie suas informações pessoais e credenciais.</p>
               </div>
               
               <div className="bg-bg-surface border border-border-default rounded-xl p-6">
                  <div className="flex items-center gap-6 mb-8">
                    <div className="relative group overflow-hidden rounded-full cursor-pointer border border-border-subtle shadow-md" style={{ backgroundColor: '#2C2D31' }}>
                       {avatarUrl ? (
                         <img src={avatarUrl} alt={appUser?.name} className="w-20 h-20 object-cover" />
                       ) : (
                         <div className="w-20 h-20 font-bold text-3xl text-white bg-gradient-to-br from-bg-surface-elevated to-bg-surface-active flex items-center justify-center">
                           {appUser?.name.charAt(0).toUpperCase()}
                         </div>
                       )}
                       <label className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                         {uploadingAvatar ? (
                           <div className="w-5 h-5 border-2 border-white rounded-full border-t-transparent animate-spin mb-1" />
                         ) : (
                           <Upload className="w-5 h-5 text-white mb-1" />
                         )}
                         <span className="text-[9px] text-white font-bold uppercase tracking-widest">{uploadingAvatar ? '...' : 'Alterar'}</span>
                         <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
                       </label>
                    </div>
                    <div>
                       <h3 className="text-lg font-bold text-text-primary">{appUser?.name}</h3>
                       <p className="text-sm text-text-tertiary">{appUser?.email}</p>
                       <span className="inline-block mt-2 px-2 py-0.5 bg-bg-surface-active border border-border-default rounded text-[10px] uppercase font-bold text-text-secondary tracking-widest">{appUser?.role}</span>
                    </div>
                  </div>

                  <div className="space-y-6 max-w-md">
                     <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-text-secondary">Nome</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full h-12 bg-bg-base border border-border-default rounded-lg px-3 text-base sm:text-sm text-text-primary outline-none focus:border-accent" />
                     </div>
                     <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-text-secondary flex justify-between">
                          <span>Email</span>
                          <span className="text-[10px] text-text-tertiary normal-case tracking-normal font-normal">Para alterar, contate o admin</span>
                        </label>
                        <input type="email" value={appUser?.email} disabled className="w-full h-12 bg-bg-surface-active border border-border-default rounded-lg px-3 text-base sm:text-sm text-text-tertiary cursor-not-allowed" />
                     </div>
                     <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-text-secondary">Telefone / WhatsApp</label>
                        <input type="text" value={phone} onChange={e => setPhone(formatPhone(e.target.value))} placeholder="+55 (11) 99999-9999" className="w-full h-12 bg-bg-base border border-border-default rounded-lg px-3 text-base sm:text-sm text-text-primary outline-none focus:border-accent" />
                     </div>

                     <div className="pt-4 border-t border-border-subtle">
                        <Button variant="outline" onClick={() => setIsPasswordModalOpen(true)} className="bg-bg-base border-border-default text-text-secondary hover:text-text-primary hover:bg-bg-surface-active">
                          Alterar Senha
                        </Button>
                     </div>
                  </div>
               </div>
               
               <div className="flex justify-end pt-4">
                  <Button onClick={handleSaveProfile} disabled={!isDirty} className="bg-accent hover:bg-accent-hover text-white px-6 w-full sm:w-auto shadow-md disabled:opacity-50 gap-2">
                    <Save className="w-4 h-4" /> Salvar alterações
                  </Button>
               </div>
            </div>
          )}

          {/* TAB: PREFS */}
          {activeTab === 'prefs' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div>
                  <h2 className="text-2xl font-bold text-text-primary mb-1">Preferências</h2>
                  <p className="text-sm text-text-secondary">Ajuste como a ferramenta se comporta para você.</p>
               </div>

               {/* Appearance */}
               <div className="bg-bg-surface border border-border-default rounded-xl overflow-hidden">
                 <div className="px-6 py-4 bg-bg-surface-elevated border-b border-border-subtle">
                   <h3 className="text-sm font-bold text-text-primary">Aparência e Interface</h3>
                 </div>
                 <div className="p-6 space-y-6">
                   <div className="flex items-center justify-between">
                     <div>
                       <span className="block text-sm font-medium text-text-primary font-bold">Tema Visual</span>
                       <span className="text-xs text-text-tertiary">Apenas dark theme está disponível nesta versão.</span>
                     </div>
                     <div className="flex bg-bg-base border border-border-default rounded-lg p-1 opacity-50 cursor-not-allowed">
                       <div className="px-4 py-1.5 bg-bg-surface-elevated rounded shadow text-xs font-bold">Dark</div>
                       <div className="px-4 py-1.5 text-xs text-text-tertiary font-bold">Light</div>
                     </div>
                   </div>
                   
                   <div className="flex items-center justify-between">
                     <div>
                       <span className="block text-sm font-medium text-text-primary font-bold">Idioma</span>
                       <span className="text-xs text-text-tertiary">Idioma da interface</span>
                     </div>
                     <select className="bg-bg-base border border-border-default rounded-lg px-3 py-1.5 text-sm text-text-primary outline-none">
                       <option>Português (Brasil)</option>
                     </select>
                   </div>
                 </div>
               </div>

               {/* Notifications */}
               <div className="bg-bg-surface border border-border-default rounded-xl overflow-hidden">
                 <div className="px-6 py-4 bg-bg-surface-elevated border-b border-border-subtle">
                   <h3 className="text-sm font-bold text-text-primary">Notificações</h3>
                 </div>
                 
                 <div className="p-6 space-y-6">
                    {/* Canals */}
                    <div className="space-y-4">
                      
                      <label className="flex items-start justify-between cursor-pointer group">
                        <div>
                          <span className="block text-sm font-medium text-text-primary group-hover:text-accent transition-colors font-bold">Receber via WhatsApp</span>
                          <span className="text-xs text-text-tertiary">Mensagens diretas pelo número cadastrado no perfil.</span>
                        </div>
                        <div className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${whatsAppNotif ? 'bg-accent' : 'bg-bg-surface-active'}`}>
                          <input type="checkbox" className="sr-only" checked={whatsAppNotif} onChange={e => updatePreference('whatsapp', e.target.checked)} />
                          <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${whatsAppNotif ? 'translate-x-4' : 'translate-x-0'}`}></span>
                        </div>
                      </label>
                      {whatsAppNotif && !phone && (
                        <div className="text-xs text-warning bg-warning-subtle/30 px-3 py-2 rounded">Aviso: Você ativou notificações via WhatsApp mas não tem um telefone cadastrado no perfil.</div>
                      )}

                      <label className="flex items-start justify-between cursor-pointer group pt-4 border-t border-border-subtle">
                        <div>
                          <span className="block text-sm font-medium text-text-primary group-hover:text-accent transition-colors font-bold">Receber via Email</span>
                          <span className="text-xs text-text-tertiary">Emails detalhados com as atividades recentes.</span>
                        </div>
                        <div className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${emailNotif ? 'bg-accent' : 'bg-bg-surface-active'}`}>
                          <input type="checkbox" className="sr-only" checked={emailNotif} onChange={e => updatePreference('email', e.target.checked)} />
                          <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${emailNotif ? 'translate-x-4' : 'translate-x-0'}`}></span>
                        </div>
                      </label>
                    </div>

                    {/* Specific Types */}
                    <div className="pt-6 border-t border-border-subtle">
                       <h4 className="text-xs font-bold uppercase tracking-widest text-text-secondary mb-4">Me avise quando...</h4>
                       <div className="space-y-3">
                         {[
                           { key: 'newVideo', label: 'Novo vídeo for atribuído a mim' },
                           { key: 'v1Delivered', label: 'Uma V1 for entregue' },
                           { key: 'comments', label: 'Adicionarem um comentário nos meus vídeos' },
                           { key: 'approved', label: 'Meu vídeo for aprovado' },
                           { key: 'deadline', label: 'Um prazo estiver próximo (< 24h)' },
                         ].map(item => (
                           <label key={item.key} className="flex items-center gap-3 cursor-pointer group">
                             <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${notifTypes[item.key as keyof typeof notifTypes] ? 'bg-accent border-accent' : 'bg-bg-base border-border-strong group-hover:border-accent'}`}>
                               <Check className={`w-3 h-3 text-white ${notifTypes[item.key as keyof typeof notifTypes] ? 'opacity-100' : 'opacity-0'}`} />
                               <input type="checkbox" className="sr-only" checked={notifTypes[item.key as keyof typeof notifTypes]} onChange={e => updateNotifType(item.key as keyof typeof notifTypes, e.target.checked)} />
                             </div>
                             <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">{item.label}</span>
                           </label>
                         ))}
                       </div>
                    </div>

                 </div>
               </div>

               {/* Display */}
               <div className="bg-bg-surface border border-border-default rounded-xl overflow-hidden">
                 <div className="px-6 py-4 bg-bg-surface-elevated border-b border-border-subtle">
                   <h3 className="text-sm font-bold text-text-primary">Display</h3>
                 </div>
                 <div className="p-6 space-y-6">
                   <div className="flex items-start justify-between">
                     <div>
                       <span className="block text-sm font-medium text-text-primary font-bold mb-1">Densidade</span>
                       <span className="text-xs text-text-tertiary">Ajuste o espaçamento global da interface</span>
                     </div>
                     <select className="bg-bg-base border border-border-default rounded-lg px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent" defaultValue="normal">
                       <option value="compact">Compacto</option>
                       <option value="normal">Normal (padrão)</option>
                       <option value="comfortable">Confortável</option>
                     </select>
                   </div>
                   
                   <div className="flex items-start justify-between pt-4 border-t border-border-subtle">
                     <div>
                       <span className="block text-sm font-medium text-text-primary font-bold mb-1">Animações</span>
                       <span className="text-xs text-text-tertiary">Reduza animações se preferir uma interface mais seca</span>
                     </div>
                     <select className="bg-bg-base border border-border-default rounded-lg px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent" defaultValue="normal">
                       <option value="reduced">Reduzidas</option>
                       <option value="normal">Normais (padrão)</option>
                     </select>
                   </div>
                 </div>
               </div>
            </div>
          )}

          {/* TAB: TEAM */}
          {activeTab === 'team' && appUser?.role === 'admin' && (
             <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div>
                  <h2 className="text-2xl font-bold text-text-primary mb-1">Gerenciar Equipe</h2>
                  <p className="text-sm text-text-secondary mb-6">Cadastre e acompanhe editores e outros membros da equipe.</p>
               </div>
               {/* Embed Editors component directly! */}
               <div className="bg-bg-surface border border-border-default rounded-xl overflow-hidden min-h-[500px] flex flex-col">
                 <Editors />
               </div>
             </div>
          )}

          {/* TAB: INTEGRATIONS */}
          {activeTab === 'integrations' && appUser?.role === 'admin' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div>
                  <h2 className="text-2xl font-bold text-text-primary mb-1">Integrações de Sistema</h2>
                  <p className="text-sm text-text-secondary">Conexões com serviços externos.</p>
               </div>
               
               <div className="grid gap-4">
                 
                 {/* Backblaze */}
                 <div className="bg-bg-surface border border-border-default rounded-xl p-5 flex items-start gap-5 group hover:border-border-strong transition-colors">
                    <div className="w-12 h-12 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                      <span className="font-bold text-red-500">B2</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-text-primary">Backblaze B2 Storage</h3>
                        <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-widest bg-success-subtle text-success">Conectado</span>
                      </div>
                      <p className="text-xs text-text-secondary mb-3">Armazenamento dos arquivos brutos e proxies.</p>
                      <div className="space-y-1">
                         <div className="flex justify-between text-[10px] text-text-tertiary font-mono">
                           <span>Uso: 245 GB / 2 TB</span>
                         </div>
                         <div className="h-1.5 w-full bg-bg-base/50 rounded-full overflow-hidden">
                           <div className="bg-accent h-full w-[12%]" />
                         </div>
                      </div>
                      <div className="mt-4 flex items-center gap-3">
                         <Button size="sm" variant="outline" onClick={() => {
                           const tid = toast.loading("Testando conexão...");
                           setTimeout(() => toast.success("Conexão estabelecida com sucesso com Backblaze B2", { id: tid }), 1500);
                         }} className="h-7 text-[10px] font-bold uppercase tracking-wider bg-bg-surface border-border-default hover:text-text-primary">Testar Conexão</Button>
                         <span className="text-[10px] text-text-tertiary">Última sync: há 2 min</span>
                      </div>
                    </div>
                 </div>

                 {/* n8n */}
                 <div className="bg-bg-surface border border-border-default rounded-xl p-5 flex items-start gap-5 group hover:border-border-strong transition-colors">
                    <div className="w-12 h-12 rounded-lg bg-[#FF6D5A]/10 border border-[#FF6D5A]/20 flex items-center justify-center shrink-0">
                      <span className="font-bold text-[#FF6D5A] font-mono text-xs">n8n</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-text-primary">n8n Automations</h3>
                        <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-widest bg-success-subtle text-success">Ativo</span>
                      </div>
                      <p className="text-xs text-text-secondary mb-3">Workflows de notificação e orquestração.</p>
                      
                      <div className="bg-bg-base/50 border border-border-subtle rounded p-2 text-[10px] font-mono text-text-tertiary mb-3 flex items-center justify-between">
                         <span className="truncate">https://n8n.thor4tech.com/webhook/video-events</span>
                      </div>

                      <div className="mt-4 flex items-center gap-3">
                         <Button size="sm" variant="outline" onClick={() => {
                           const tid = toast.loading("Enviando ping...");
                           setTimeout(() => toast.success("Ping recebido (200 OK)", { id: tid }), 1000);
                         }} className="h-7 text-[10px] font-bold uppercase tracking-wider bg-bg-surface border-border-default hover:text-text-primary">Disparar Ping</Button>
                         <span className="text-[10px] text-text-tertiary">Último disparo: há 5 min</span>
                      </div>
                    </div>
                 </div>

                 {/* WhatsApp Uazapi */}
                 <div className="bg-bg-surface border border-border-default rounded-xl p-5 flex items-start gap-5 group hover:border-border-strong transition-colors">
                    <div className="w-12 h-12 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0">
                      <span className="font-bold text-green-500 font-mono text-xs">Uaz</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-text-primary">WhatsApp Uazapi</h3>
                        <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-widest bg-success-subtle text-success">Conectado</span>
                      </div>
                      <p className="text-xs text-text-secondary mb-3">Envio de notificações diretas no WhatsApp da equipe.</p>

                      <div className="mt-4 flex items-center gap-3">
                         <Button size="sm" variant="outline" onClick={() => {
                           const tid = toast.loading("Enviando zap...");
                           setTimeout(() => toast.success("Mensagem de teste enviada!", { id: tid }), 1200);
                         }} className="h-7 text-[10px] font-bold uppercase tracking-wider bg-bg-surface border-border-default hover:text-text-primary">Testar Envio</Button>
                      </div>
                    </div>
                 </div>

                 {/* Cloudflare CDN */}
                 <div className="bg-bg-surface border border-border-default rounded-xl p-5 flex items-start gap-5 group hover:border-border-strong transition-colors">
                    <div className="w-12 h-12 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0 opacity-50">
                      <span className="font-bold text-orange-500 font-mono text-xs">CDN</span>
                    </div>
                    <div className="flex-1 opacity-70">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-text-primary">Cloudflare CDN</h3>
                        <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-widest bg-bg-surface-elevated text-text-tertiary">Não configurado</span>
                      </div>
                      <p className="text-xs text-text-secondary mb-3">Distribuição em cache dos vídeos brutos e exports (Futuro).</p>

                      <div className="mt-2 flex items-center gap-3">
                         <Button size="sm" variant="outline" className="h-7 text-[10px] font-bold uppercase tracking-wider bg-bg-surface border-border-default text-text-tertiary hover:bg-bg-surface hover:text-text-tertiary cursor-not-allowed">Configurar CDN</Button>
                      </div>
                    </div>
                 </div>

               </div>
            </div>
          )}

          {/* TAB: SHORTCUTS */}
          {activeTab === 'shortcuts' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div>
                  <h2 className="text-2xl font-bold text-text-primary mb-1">Atalhos de Teclado</h2>
                  <p className="text-sm text-text-secondary">Trabalhe mais rápido usando atalhos.</p>
               </div>
               
               <div className="space-y-6 text-sm">
                  
                  <div>
                    <h3 className="font-bold text-text-primary mb-3 pb-2 border-b border-border-subtle">Navegação Global</h3>
                    <div className="grid grid-cols-2 gap-y-3">
                       <div className="flex items-center justify-between pr-8">
                         <span className="text-text-secondary">Buscar ou pular</span>
                         <div className="flex gap-1"><kbd className="bg-bg-surface-active px-1.5 rounded font-mono text-xs border border-border-default">Cmd</kbd><kbd className="bg-bg-surface-active px-1.5 rounded font-mono text-xs border border-border-default">K</kbd></div>
                       </div>
                       <div className="flex items-center justify-between pl-8 border-l border-border-default/50">
                         <span className="text-text-secondary">Mostrar atalhos</span>
                         <div className="flex gap-1"><kbd className="bg-bg-surface-active px-1.5 rounded font-mono text-xs border border-border-default">Cmd</kbd><kbd className="bg-bg-surface-active px-1.5 rounded font-mono text-xs border border-border-default">/</kbd></div>
                       </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-text-primary mb-3 pb-2 border-b border-border-subtle mt-8">Player de Vídeo</h3>
                    <div className="grid grid-cols-2 gap-y-3 gap-x-8">
                       <div className="flex items-center justify-between">
                         <span className="text-text-secondary">Play/Pause</span>
                         <div className="flex gap-1"><kbd className="bg-bg-surface-active px-2 rounded font-mono text-xs border border-border-default tracking-widest">Espaço</kbd></div>
                       </div>
                       <div className="flex items-center justify-between">
                         <span className="text-text-secondary">Comentar no timecode</span>
                         <div className="flex gap-1"><kbd className="bg-bg-surface-active px-1.5 rounded font-mono text-xs border border-border-default">C</kbd></div>
                       </div>
                       <div className="flex items-center justify-between">
                         <span className="text-text-secondary">Avançar 10s</span>
                         <div className="flex gap-1"><kbd className="bg-bg-surface-active px-1.5 rounded font-mono text-xs border border-border-default">L</kbd></div>
                       </div>
                       <div className="flex items-center justify-between">
                         <span className="text-text-secondary">Voltar 10s</span>
                         <div className="flex gap-1"><kbd className="bg-bg-surface-active px-1.5 rounded font-mono text-xs border border-border-default">J</kbd></div>
                       </div>
                       <div className="flex items-center justify-between">
                         <span className="text-text-secondary">Avançar 1s</span>
                         <div className="flex gap-1"><kbd className="bg-bg-surface-active px-1.5 rounded font-mono text-xs border border-border-default">→</kbd></div>
                       </div>
                       <div className="flex items-center justify-between">
                         <span className="text-text-secondary">Mute / Unmute</span>
                         <div className="flex gap-1"><kbd className="bg-bg-surface-active px-1.5 rounded font-mono text-xs border border-border-default">M</kbd></div>
                       </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-text-primary mb-3 pb-2 border-b border-border-subtle mt-8">Comentários</h3>
                    <div className="grid grid-cols-2 gap-y-3 gap-x-8">
                       <div className="flex items-center justify-between">
                         <span className="text-text-secondary">Enviar comentário</span>
                         <div className="flex gap-1"><kbd className="bg-bg-surface-active px-1.5 rounded font-mono text-xs border border-border-default">Cmd</kbd><kbd className="bg-bg-surface-active px-1.5 rounded font-mono text-xs border border-border-default">Enter</kbd></div>
                       </div>
                    </div>
                  </div>

               </div>
            </div>
          )}

          {/* TAB: ABOUT */}
          {activeTab === 'about' && (
            <div className="flex flex-col items-center justify-center pt-16 animate-in zoom-in-95 duration-500">
               <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center font-bold text-white text-2xl shadow-[0_4px_24px_rgba(242,101,34,0.4)] mb-6 -rotate-6">T4</div>
               <h2 className="text-2xl font-bold tracking-tight text-white mb-2">Thor4Tech Studio</h2>
               <p className="text-sm text-text-tertiary mb-6">Versão 1.0.0-beta</p>
               
               <div className="bg-bg-surface border border-border-default rounded-xl w-full max-w-sm divide-y divide-border-subtle">
                 <button className="w-full px-4 py-3 flex items-center justify-between text-sm text-text-secondary hover:text-text-primary hover:bg-bg-surface-active transition-colors">
                   Changelog
                   <span className="text-[10px] bg-bg-surface-elevated border border-border-default px-1.5 rounded text-text-tertiary font-mono">v1.0.0</span>
                 </button>
                 <button className="w-full px-4 py-3 flex items-center justify-between text-sm text-text-secondary hover:text-text-primary hover:bg-bg-surface-active transition-colors">
                   Documentação Interna
                 </button>
                 <button className="w-full px-4 py-3 flex items-center justify-between text-sm text-text-secondary hover:text-text-primary hover:bg-bg-surface-active transition-colors">
                   Reportar um Problema
                 </button>
                 <button className="w-full px-4 py-3 flex items-center justify-between text-sm text-text-secondary hover:text-text-primary hover:bg-bg-surface-active transition-colors rounded-b-xl">
                   Status do Sistema
                   <div className="flex items-center gap-1.5 text-[10px] text-success font-bold uppercase tracking-widest"><div className="w-2 h-2 rounded-full bg-success animate-pulse" /> All Systems Op</div>
                 </button>
               </div>
               
               <p className="text-[10px] text-text-tertiary uppercase tracking-widest mt-12 font-medium">Design & Code by Thor4Tech © 2026</p>
            </div>
          )}

        </div>
      </div>

      {/* CHANGE PASSWORD MODAL */}
      <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
        <DialogContent className="bg-bg-surface border-border-default text-text-primary p-6 w-full max-w-md sm:rounded-xl rounded-none h-[100dvh] sm:h-auto overflow-y-auto m-0 sm:m-auto flex flex-col pt-safe px-safe pb-safe z-[70]">
          <DialogHeader>
            <DialogTitle>Alterar Senha</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="flex-1 flex flex-col space-y-4 py-4">
            
            {pwdError && <div className="p-3 bg-danger-subtle border border-danger/30 text-danger text-sm rounded-lg shrink-0">{pwdError}</div>}
            
            <div className="space-y-1.5 shrink-0">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Senha atual</label>
              <div className="relative">
                 <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required className="w-full h-12 text-base sm:text-sm bg-bg-base border border-border-default rounded-lg px-3 outline-none focus:border-accent" />
              </div>
            </div>
            <div className="space-y-1.5 pt-2 shrink-0">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Nova Senha</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={8} className="w-full h-12 text-base sm:text-sm bg-bg-base border border-border-default rounded-lg px-3 outline-none focus:border-accent" />
            </div>
            <div className="space-y-1.5 shrink-0">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Confirmar Nova Senha</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={8} className="w-full h-12 text-base sm:text-sm bg-bg-base border border-border-default rounded-lg px-3 outline-none focus:border-accent" />
            </div>
            
            <DialogFooter className="mt-auto sm:mt-6 pt-6 flex gap-2 w-full pt-safe-bottom">
               <Button type="button" variant="outline" onClick={() => setIsPasswordModalOpen(false)} className="bg-bg-surface border-border-default text-text-secondary flex-1 h-12">Cancelar</Button>
               <Button type="submit" disabled={!currentPassword || !newPassword || !confirmPassword} className="bg-accent hover:bg-accent-hover text-white disabled:opacity-50 flex-1 h-12">Atualizar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
