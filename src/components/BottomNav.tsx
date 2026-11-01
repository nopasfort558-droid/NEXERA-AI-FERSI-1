import React from 'react';
import { Home, MessageSquare, Image as ImageIcon, Eye, User } from 'lucide-react';
import { TabType } from '../types';
import { playClickSound } from '../utils/audio';

interface BottomNavProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onSelectTab }) => {
  const tabs = [
    { id: 'dashboard' as TabType, label: 'Dashboard', icon: Home },
    { id: 'chat' as TabType, label: 'Chat', icon: MessageSquare },
    { id: 'image' as TabType, label: 'Image', icon: ImageIcon },
    { id: 'vision' as TabType, label: 'Vision', icon: Eye },
    { id: 'profil' as TabType, label: 'Profil', icon: User },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none pb-2 pt-1 flex flex-col items-center justify-end px-3">
      {/* Floating Pill Container */}
      <nav className="pointer-events-auto max-w-lg w-full bg-[#050b1d]/90 backdrop-blur-xl border border-cyan-500/30 rounded-full px-2 py-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.8),0_0_20px_rgba(6,182,212,0.25)] flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => {
                playClickSound();
                onSelectTab(tab.id);
              }}
              className={`relative flex flex-col items-center justify-center py-1 px-3 sm:px-4 rounded-full transition-all duration-300 cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600/40 via-cyan-500/30 to-purple-600/40 text-cyan-300 border border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon
                className={`w-5 h-5 transition-transform duration-300 ${
                  isActive ? 'scale-110 text-cyan-300' : 'text-slate-400'
                }`}
              />
              <span
                className={`text-[10px] sm:text-[11px] font-semibold mt-0.5 tracking-tight transition-all ${
                  isActive ? 'text-white' : 'text-slate-400'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Mobile Bottom Home Bar Indicator */}
      <div className="w-32 h-1 bg-slate-700/60 rounded-full mt-2 pointer-events-none" />
    </div>
  );
};
