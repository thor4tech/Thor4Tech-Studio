import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { LayoutDashboard, Users, UserCog, Upload, LogOut, Menu, X, Settings, Search } from "lucide-react";
import { useState } from "react";
import PageTransition from "./PageTransition";

export default function Layout() {
  const { appUser, logOut } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (!appUser) return null;

  const isAdmin = appUser.role === 'admin';

  const navItems = [
    ...(isAdmin ? [{ icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" }] : []),
    { icon: Users, label: "Clientes", path: "/clients" },
    { icon: Upload, label: "Upload Brutos", path: "/upload" },
    ...(isAdmin ? [{ icon: UserCog, label: "Editores", path: "/editors" }] : []),
    { icon: Settings, label: "Configurações", path: "/settings", mobileOnly: true },
  ];

  return (
    <div className="flex h-[100dvh] bg-bg-base text-text-primary font-sans overflow-hidden">
      
      {/* DESKTOP & TABLET SIDEBAR */}
      <aside className={`hidden md:flex flex-col bg-bg-surface border-r border-border-default transition-all duration-300 lg:w-64 w-16 group`}>
        <div className="p-4 lg:p-6 flex items-center justify-center lg:justify-start gap-3 border-b border-border-default/50 lg:border-transparent cursor-pointer">
          <div className="w-8 h-8 shrink-0 bg-accent rounded flex items-center justify-center font-bold text-white shadow-md">T4</div>
          <span className="font-bold tracking-tight text-lg hidden lg:block text-text-primary">THOR4TECH <span className="text-accent">STUDIO</span></span>
        </div>
        
        <nav className="flex-1 px-2 lg:px-4 space-y-2 mt-4">
          {navItems.filter(item => !item.mobileOnly).map((item) => {
            const active = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors font-medium lg:justify-start justify-center relative ${
                  active 
                    ? "bg-bg-surface-elevated text-accent lg:border-l-2 lg:border-accent" 
                    : "hover:bg-bg-surface-active text-text-secondary hover:text-text-primary"
                }`}
                title={item.label}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <span className="text-sm hidden lg:block truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 mt-auto border-t border-border-default/50 lg:border-transparent hidden lg:block">
          <div className="bg-bg-surface-elevated p-4 rounded-xl border border-border-default mb-4 hover:border-border-strong transition-colors">
            <p className="text-[10px] uppercase tracking-widest text-text-tertiary mb-2">Sua Conta</p>
            <div className="flex items-center gap-3 mb-4">
              <Link to="/settings" className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-tr from-accent to-accent-hover flex items-center justify-center text-sm font-bold text-white uppercase shadow-lg hover:scale-105 transition-transform">
                {appUser.name.charAt(0)}
              </Link>
              <div className="flex-1 min-w-0">
                <Link to="/settings" className="text-xs font-medium text-text-primary truncate hover:underline block">{appUser.name}</Link>
                <p className="text-[10px] text-text-secondary capitalize">{appUser.role}</p>
              </div>
            </div>
            <button 
              onClick={logOut}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-text-secondary hover:text-text-primary hover:bg-bg-surface-active border border-border-subtle transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sair
            </button>
          </div>
        </div>

        {/* Minimal User Block for Tablet */}
        <div className="p-2 mt-auto border-t border-border-default/50 lg:hidden flex flex-col items-center gap-2">
            <Link to="/settings" title="Configurações" className="w-10 h-10 rounded-full bg-gradient-to-tr from-accent to-accent-hover flex items-center justify-center text-sm font-bold text-white uppercase shadow-lg hover:scale-105 transition-transform">
              {appUser.name.charAt(0)}
            </Link>
             <button title="Sair" onClick={logOut} className="w-10 h-10 flex items-center justify-center rounded-lg text-text-secondary hover:text-danger hover:bg-danger-subtle transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
        </div>
      </aside>

      {/* MOBILE DRAWER OVERLAY */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden animate-in fade-in duration-200"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* MOBILE DRAWER MENU */}
      <aside className={`fixed inset-y-0 left-0 w-72 bg-bg-surface border-r border-border-default z-50 transform transition-transform duration-200 ease-out md:hidden flex flex-col pt-safe pb-safe ${
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        <div className="p-4 flex items-center justify-between border-b border-border-default">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 shrink-0 bg-accent rounded flex items-center justify-center font-bold text-white shadow-md">T4</div>
            <span className="font-bold tracking-tight text-lg text-text-primary">THOR4TECH</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-text-secondary hover:text-text-primary rounded-lg bg-bg-base">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const active = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-4 px-4 h-12 rounded-lg transition-colors font-medium relative ${
                  active 
                    ? "bg-accent-subtle text-accent border-l-2 border-accent" 
                    : "hover:bg-bg-surface-active text-text-secondary text-text-primary"
                }`}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <span className="text-base truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 mt-auto border-t border-border-default bg-bg-surface-elevated">
            <div className="flex items-center gap-3 mb-4">
              <Link to="/settings" onClick={() => setIsMobileMenuOpen(false)} className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-tr from-accent to-accent-hover flex items-center justify-center text-sm font-bold text-white uppercase shadow-lg">
                {appUser.name.charAt(0)}
              </Link>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate block">{appUser.name}</p>
                <p className="text-xs text-text-secondary capitalize">{appUser.email}</p>
              </div>
            </div>
            <button 
              onClick={logOut}
              className="w-full flex items-center justify-center gap-2 h-12 rounded-lg text-sm font-bold text-danger bg-danger-subtle/50 hover:bg-danger-subtle border border-danger/20 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sair da conta
            </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        
        {/* TOP NAVBAR (Desktop/Tablet/Mobile) */}
        <header className="h-14 sm:h-16 pt-safe border-b border-border-default flex items-center justify-between px-4 sm:px-8 bg-bg-surface shrink-0 z-20 shadow-sm relative">
          
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Dropdown Trigger */}
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 -ml-2 text-text-secondary hover:text-text-primary active:bg-bg-surface-active rounded-lg transition-colors"
              aria-label="Abrir menu"
            >
              <Menu className="w-6 h-6" />
            </button>

            <h1 className="text-lg font-bold text-text-primary hidden sm:block">{
               location.pathname.includes('dashboard') ? 'Dashboard' :
               location.pathname.includes('clients') ? 'Clientes' :
               location.pathname.includes('upload') ? 'Upload de Arquivos' :
               location.pathname.includes('editors') ? 'Gerenciar Editores' :
               location.pathname.includes('settings') ? 'Configurações' : 'Studio'
            }</h1>
            <div className="sm:hidden font-bold flex items-center gap-2">
               <div className="w-6 h-6 bg-accent rounded flex items-center justify-center font-bold text-white text-[10px]">T4</div>
               Thor4Tech
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-6">
            
            {/* Search Top Nav */}
            <div className="relative group hidden md:block">
              <input type="text" placeholder="Buscar vídeo ou cliente..." className="bg-bg-base border border-border-default rounded-full pl-4 pr-10 py-1.5 text-sm w-64 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all placeholder:text-text-tertiary text-text-primary" />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary group-focus-within:text-accent transition-colors">
                 <Search className="w-4 h-4"/>
              </div>
            </div>

            <button className="md:hidden p-2 text-text-secondary hover:text-text-primary rounded-full active:bg-bg-surface-active transition-colors">
              <Search className="w-5 h-5"/>
            </button>

            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-text-primary">{appUser.name}</p>
                <p className="text-[10px] text-text-tertiary">{appUser.email}</p>
              </div>
              <Link to="/settings" className="w-8 h-8 rounded-full bg-gradient-to-tr from-bg-surface-elevated to-bg-surface-active flex items-center justify-center font-bold text-xs uppercase shadow-md text-white border border-border-default hover:border-accent cursor-pointer transition-colors">
                {appUser.name.charAt(0)}
              </Link>
            </div>
          </div>
        </header>
        
        <div className="flex-1 overflow-x-hidden overflow-y-auto bg-bg-base relative flex flex-col pb-16 md:pb-0">
           <Outlet />
        </div>

        {/* MOBILE BOTTOM NAVIGATION */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-bg-surface border-t border-border-default pb-safe z-30 flex items-stretch px-2 shadow-[0_-4px_24px_rgba(0,0,0,0.6)]">
           {navItems.filter(item => !item.mobileOnly && item.path !== '/editors').slice(0, 4).map(item => {
             const active = location.pathname.startsWith(item.path);
             return (
               <Link 
                  key={item.path}
                  to={item.path}
                  className={`flex-1 flex flex-col items-center justify-center py-2 h-[60px] gap-1 transition-colors ${
                     active ? 'text-accent' : 'text-text-tertiary hover:text-text-secondary'
                  }`}
               >
                 <item.icon className={`w-5 h-5 ${active ? 'fill-accent/20' : ''}`} />
                 <span className="text-[10px] font-medium leading-none">{item.label.split(' ')[0]}</span>
               </Link>
             );
           })}
        </nav>
      </main>
    </div>
  );
}
