import { useState, FormEvent } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { useAuth } from "../lib/auth";
import { Navigate, useSearchParams } from "react-router-dom";
import { Video, Film, LayoutTemplate, Layers, Eye, EyeOff, Loader2 } from "lucide-react";
import PageTransition from "../components/PageTransition";
import { motion } from "motion/react";
import { signInWithEmailAndPassword, sendPasswordResetEmail, setPersistence, browserLocalPersistence, browserSessionPersistence } from "firebase/auth";
import { auth } from "../lib/firebase";
import { toast } from "sonner";
import { FirebaseError } from "firebase/app";

export default function Login() {
  const { user, appUser, signInWithGoogle, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetting, setResetting] = useState(false);

  // Validate only internally starting with slash
  let redirect = searchParams.get("redirect") || "/";
  if (!redirect.startsWith("/")) redirect = "/";

  if (authLoading) return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-bg-base text-text-primary">
      <div className="w-12 h-12 rounded-xl bg-accent-subtle flex items-center justify-center border border-accent/20 mb-4 shadow-[0_0_15px_rgba(242,101,34,0.15)]">
        <Video className="w-6 h-6 text-accent" />
      </div>
      <Loader2 className="w-6 h-6 animate-spin text-accent" />
    </div>
  );
  
  if (user && appUser) return <Navigate to={redirect} replace />;

  const handleEmailLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || password.length < 8) return;
    
    setSubmitting(true);
    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      await signInWithEmailAndPassword(auth, email, password);
      // Success is handled by onAuthStateChanged in AuthProvider
    } catch (error: any) {
      console.error(error);
      const err = error as FirebaseError;
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        toast.error("Email ou senha incorretos");
      } else if (err.code === 'auth/user-not-found') {
        toast.error("Conta não encontrada. Peça acesso ao admin.");
      } else if (err.code === 'auth/too-many-requests') {
        toast.error("Muitas tentativas. Aguarde alguns minutos.");
      } else if (err.code === 'auth/invalid-email') {
        toast.error("Formato de email inválido");
      } else {
        toast.error("Erro ao fazer login. Tente novamente.");
      }
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
     try {
       await signInWithGoogle();
     } catch (error: any) {
       console.error(error);
       if (error?.code !== 'auth/popup-closed-by-user') {
         toast.error("Erro ao fazer login com Google.");
       }
     }
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return;
    setResetting(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      toast.success("Link enviado para seu email");
      setResetModalOpen(false);
      setResetEmail("");
    } catch (error: any) {
      toast.error("Erro ao tentar enviar o email de recuperação.");
    } finally {
       setResetting(false);
    }
  };

  return (
    <PageTransition className="h-screen w-screen flex bg-bg-base overflow-hidden">
      {/* LEFT SIDE - Form */}
      <div className="w-full md:w-1/2 flex flex-col justify-center items-center py-12 px-6 bg-bg-base relative z-10 overflow-y-auto custom-scrollbar">
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="w-full max-w-[380px] space-y-8"
        >
          <div className="space-y-3">
            <div className="flex flex-col items-start gap-3 mb-8">
              <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center border border-accent/20 shadow-[0_4px_16px_rgba(242,101,34,0.3)]">
                <span className="text-white font-bold text-xl uppercase tracking-tighter">T4</span>
              </div>
              <h1 className="text-xs font-bold tracking-widest text-accent uppercase">Studio</h1>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-text-primary">Bem-vindo de volta</h1>
            <p className="text-[15px] text-text-secondary">
              Faça login pra continuar
            </p>
          </div>
          
          <form onSubmit={handleEmailLogin} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-xs text-text-tertiary uppercase tracking-[0.08em] font-semibold">Email</Label>
              <Input 
                autoFocus
                type="email"
                required
                disabled={submitting}
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="bg-bg-surface border-border-default focus:border-accent h-11" 
              />
            </div>
            <div className="space-y-2 relative">
              <Label className="text-xs text-text-tertiary uppercase tracking-[0.08em] font-semibold">Senha</Label>
              <div className="relative">
                <Input 
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  disabled={submitting}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="bg-bg-surface border-border-default focus:border-accent h-11 pr-10" 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary z-10 p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-2 pt-1 pb-1">
              <input 
                type="checkbox" 
                id="remember" 
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                className="rounded border-border-strong accent-accent bg-transparent w-3.5 h-3.5 cursor-pointer" 
              />
              <label htmlFor="remember" className="text-[13px] text-text-secondary cursor-pointer select-none">
                Lembrar de mim
              </label>
            </div>

            <Button 
              type="submit"
              disabled={submitting || !email || password.length < 8}
              className="w-full h-11 bg-accent border-none hover:bg-accent-hover text-white font-semibold shadow-[0_4px_14px_rgba(242,101,34,0.3)] transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Entrando...</>
              ) : "Entrar"}
            </Button>
          </form>

          <div className="relative flex items-center justify-center my-6">
             <div className="absolute w-full border-t border-border-subtle"></div>
             <span className="bg-bg-base px-4 text-xs font-medium text-text-tertiary uppercase tracking-widest relative z-10">ou</span>
          </div>

          <Button 
            onClick={handleGoogleLogin} 
            disabled={submitting}
            variant="outline"
            className="w-full h-11 bg-bg-surface border border-border-default hover:bg-bg-surface-elevated hover:border-border-strong text-text-primary font-semibold shadow-sm transition-all flex items-center justify-center group"
          >
            <div className="p-1 rounded mr-3 group-hover:scale-105 transition-transform">
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            </div>
            Entrar com Google
          </Button>
          
          <div className="pt-4 flex flex-col items-center gap-4 text-center">
            <button 
              type="button" 
              onClick={() => setResetModalOpen(true)}
              className="text-xs font-semibold text-accent hover:text-accent-hover transition-colors"
            >
              Esqueci minha senha
            </button>
            <p className="text-[11px] text-text-tertiary font-medium">
              Não tem conta? Peça acesso ao admin.
            </p>
          </div>
        </motion.div>
      </div>

      {/* RIGHT SIDE - Visuals */}
      <div className="hidden md:flex w-1/2 bg-black relative flex-col items-center justify-center overflow-hidden border-l border-border-default z-0">
        {/* Abstract Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-accent/15 via-black to-black opacity-80" />
        <div className="absolute top-1/4 -right-1/4 w-[800px] h-[800px] bg-accent/20 rounded-full blur-[120px] pointer-events-none animate-pulse-slow"></div>
        <div className="absolute -bottom-1/4 -left-1/4 w-[600px] h-[600px] bg-warning/10 rounded-full blur-[100px] pointer-events-none"></div>

        {/* Abstract UI Mockup */}
        <div className="relative w-full max-w-[500px] perspective-1000 z-10 px-8">
           <motion.div 
             initial={{ rotateY: 15, rotateX: 5, x: 50, opacity: 0 }}
             animate={{ rotateY: -15, rotateX: 8, x: 0, opacity: 1 }}
             transition={{ duration: 1.5, ease: "easeOut" }}
             className="w-full bg-bg-surface-elevated/60 backdrop-blur-xl border border-border-default rounded-2xl shadow-2xl overflow-hidden p-5 relative"
             style={{ boxShadow: "-20px 30px 60px rgba(0,0,0,0.8)" }}
           >
             <div className="flex gap-2 mb-6">
               <div className="w-3 h-3 rounded-full bg-border-strong"></div>
               <div className="w-3 h-3 rounded-full bg-border-strong"></div>
               <div className="w-3 h-3 rounded-full bg-border-strong"></div>
             </div>
             
             {/* Fake Kanban */}
             <div className="flex gap-4 mb-4 opacity-80">
                <div className="flex-1 space-y-3">
                  <div className="h-1.5 w-16 bg-accent rounded"></div>
                  <div className="h-20 bg-bg-base/80 border border-border-default/50 rounded-lg"></div>
                  <div className="h-24 bg-bg-base/80 border border-border-default/50 rounded-lg"></div>
                </div>
                <div className="flex-1 space-y-3">
                  <div className="h-1.5 w-16 bg-warning rounded"></div>
                  <div className="h-24 bg-bg-base/80 border border-border-default/50 rounded-lg"></div>
                  <div className="h-20 bg-bg-base/80 border border-border-default/50 rounded-lg"></div>
                </div>
             </div>
             {/* Player stub */}
             <div className="h-32 bg-bg-base/80 border border-border-default/50 rounded-lg mb-2 relative overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent"></div>
                <div className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center font-bold shadow-[0_0_15px_rgba(242,101,34,0.4)]">
                   <div className="w-0 h-0 border-t-[5px] border-t-transparent border-l-[8px] border-l-white border-b-[5px] border-b-transparent ml-1"></div>
                </div>
             </div>
           </motion.div>

           {/* Quote */}
           <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 1 }}
              className="mt-16"
           >
             <h3 className="text-[26px] font-light text-white leading-tight mb-3">
               "A operação de vídeos da Thor4Tech, num só lugar."
             </h3>
             <p className="text-text-tertiary text-[15px] font-medium tracking-wide">
               Pipeline visual, revisão por timecode, aprovação 1-clique.
             </p>
           </motion.div>
        </div>
      </div>

      {/* RECOVER PASSWORD DIALOG */}
      <Dialog open={resetModalOpen} onOpenChange={setResetModalOpen}>
        <DialogContent className="bg-bg-surface-elevated border-border-default text-text-primary rounded-2xl max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold tracking-tight">Recuperar senha</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleResetPassword} className="space-y-4 pt-4">
            <p className="text-[13px] text-text-secondary leading-relaxed">
              Enviaremos um link para o seu email para redefinir sua senha.
            </p>
            <div className="space-y-2">
              <Label className="text-xs text-text-tertiary uppercase tracking-[0.08em] font-semibold">Email</Label>
              <Input 
                type="email"
                required
                value={resetEmail}
                onChange={e => setResetEmail(e.target.value)}
                className="bg-bg-base border-border-default focus:border-accent h-11" 
                placeholder="seuemail@exemplo.com"
              />
            </div>
            <div className="pt-4 flex justify-end gap-3">
               <Button 
                 type="button" 
                 variant="ghost" 
                 onClick={() => setResetModalOpen(false)}
                 className="text-text-secondary hover:text-text-primary hover:bg-bg-base"
               >
                 Cancelar
               </Button>
               <Button 
                 type="submit" 
                 disabled={resetting || !resetEmail}
                 className="bg-accent hover:bg-accent-hover text-white shadow-[0_2px_8px_rgba(242,101,34,0.3)]"
               >
                 {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enviar link"}
               </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
