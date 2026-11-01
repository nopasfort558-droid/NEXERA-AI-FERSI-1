import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { HeroBanner } from './components/HeroBanner';
import { WelcomeCard } from './components/WelcomeCard';
import { FeatureCards } from './components/FeatureCards';
import { BottomNav } from './components/BottomNav';
import { SideDrawer } from './components/SideDrawer';
import { NotificationsModal } from './components/NotificationsModal';
import { LoginModal } from './components/LoginModal';
import { ChatTab } from './components/ChatTab';
import { ImageTab } from './components/ImageTab';
import { VisionTab } from './components/VisionTab';
import { ProfileTab } from './components/ProfileTab';
import { WABotTab } from './components/WABotTab';
import { AppBuilderTab } from './components/AppBuilderTab';
import { AgentBuilderTab } from './components/AgentBuilderTab';
import { MemoryTab } from './components/MemoryTab';
import { VoiceTab } from './components/VoiceTab';
import { KnowledgeBaseTab } from './components/KnowledgeBaseTab';
import { WritingTab } from './components/WritingTab';
import { VideoSplashScreen } from './components/VideoSplashScreen';
import { AndroidCenterModal } from './components/AndroidCenterModal';
import { TabType } from './types';

function MainApp() {
  const { isLoggedIn, setLoginModalOpen } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [sideDrawerOpen, setSideDrawerOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [androidCenterOpen, setAndroidCenterOpen] = useState(false);
  
  // Show splash opening video only once per session or on manual replay
  const [showSplash, setShowSplash] = useState(() => {
    try {
      return !sessionStorage.getItem('nexera_intro_played');
    } catch {
      return true;
    }
  });

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col relative selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Official Opening Video Animation Splash */}
      {showSplash && (
        <VideoSplashScreen
          onComplete={() => setShowSplash(false)}
          isLoggedIn={isLoggedIn}
          onOpenLogin={() => setLoginModalOpen(true)}
        />
      )}

      {/* Background Cyber Ambient Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px]" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-cyan-600/10 rounded-full blur-[120px]" />
      </div>

      {/* Top Header */}
      <Header
        onOpenMenu={() => setSideDrawerOpen(true)}
        onOpenNotifications={() => setNotificationsOpen(true)}
        onGoToProfile={() => setActiveTab('profil')}
        onOpenAndroidCenter={() => setAndroidCenterOpen(true)}
      />

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-3.5 sm:px-6 py-4 sm:py-6 pb-28">
        {activeTab === 'dashboard' && (
          <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
            {/* 1. Gojo vs Sasuke Dual Live Video Hero Banner */}
            <HeroBanner />

            {/* 2. Welcome Card with dynamic user greeting and quote */}
            <WelcomeCard onStartChat={() => setActiveTab('chat')} />

            {/* 3. Main Feature Cards (Fitur Utama) */}
            <FeatureCards onSelectTab={(tab) => setActiveTab(tab)} />
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="animate-in fade-in duration-200">
            <ChatTab />
          </div>
        )}

        {activeTab === 'image' && (
          <div className="animate-in fade-in duration-200">
            <ImageTab />
          </div>
        )}

        {activeTab === 'vision' && (
          <div className="animate-in fade-in duration-200">
            <VisionTab />
          </div>
        )}

        {activeTab === 'wabot' && (
          <div className="animate-in fade-in duration-200">
            <WABotTab />
          </div>
        )}

        {activeTab === 'appbuilder' && (
          <div className="animate-in fade-in duration-200">
            <AppBuilderTab />
          </div>
        )}

        {activeTab === 'agents' && (
          <div className="animate-in fade-in duration-200">
            <AgentBuilderTab />
          </div>
        )}

        {activeTab === 'memory' && (
          <div className="animate-in fade-in duration-200">
            <MemoryTab />
          </div>
        )}

        {activeTab === 'voice' && (
          <div className="animate-in fade-in duration-200">
            <VoiceTab />
          </div>
        )}

        {activeTab === 'knowledge' && (
          <div className="animate-in fade-in duration-200">
            <KnowledgeBaseTab />
          </div>
        )}

        {activeTab === 'writing' && (
          <div className="animate-in fade-in duration-200">
            <WritingTab />
          </div>
        )}

        {activeTab === 'profil' && (
          <div className="animate-in fade-in duration-200">
            <ProfileTab />
          </div>
        )}
      </main>

      {/* Floating Bottom Navigation */}
      <BottomNav activeTab={activeTab} onSelectTab={setActiveTab} />

      {/* Slide Drawer Menu */}
      <SideDrawer
        isOpen={sideDrawerOpen}
        onClose={() => setSideDrawerOpen(false)}
        onSelectTab={setActiveTab}
        onOpenAndroidCenter={() => setAndroidCenterOpen(true)}
        onReplayIntro={() => setShowSplash(true)}
      />

      {/* Notifications Modal */}
      <NotificationsModal
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />

      {/* Android APK & Published Link Center Modal */}
      <AndroidCenterModal
        isOpen={androidCenterOpen}
        onClose={() => setAndroidCenterOpen(false)}
      />

      {/* Login & Switch Profile Modal */}
      <LoginModal />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
