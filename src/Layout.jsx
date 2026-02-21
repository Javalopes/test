import React from 'react';
import { Toaster } from 'sonner';
import GlobalAlertBanner from '@/components/GlobalAlertBanner';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-slate-950">
      <style>{`
        :root {
          --background: 222.2 84% 4.9%;
          --foreground: 210 40% 98%;
          --card: 222.2 84% 4.9%;
          --card-foreground: 210 40% 98%;
          --popover: 222.2 84% 4.9%;
          --popover-foreground: 210 40% 98%;
          --primary: 217.2 91.2% 59.8%;
          --primary-foreground: 222.2 47.4% 11.2%;
          --secondary: 217.2 32.6% 17.5%;
          --secondary-foreground: 210 40% 98%;
          --muted: 217.2 32.6% 17.5%;
          --muted-foreground: 215 20.2% 65.1%;
          --accent: 217.2 32.6% 17.5%;
          --accent-foreground: 210 40% 98%;
          --destructive: 0 62.8% 30.6%;
          --destructive-foreground: 210 40% 98%;
          --border: 217.2 32.6% 17.5%;
          --input: 217.2 32.6% 17.5%;
          --ring: 224.3 76.3% 48%;
        }
        
        * {
          scrollbar-width: thin;
          scrollbar-color: rgba(6, 182, 212, 0.3) transparent;
        }
        
        *::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        
        *::-webkit-scrollbar-track {
          background: transparent;
        }
        
        *::-webkit-scrollbar-thumb {
          background-color: rgba(6, 182, 212, 0.3);
          border-radius: 3px;
        }
        
        *::-webkit-scrollbar-thumb:hover {
          background-color: rgba(6, 182, 212, 0.5);
        }
        
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 5px rgba(6, 182, 212, 0.3); }
          50% { box-shadow: 0 0 20px rgba(6, 182, 212, 0.6); }
        }
        
        .glow-pulse {
          animation: pulse-glow 2s ease-in-out infinite;
        }
      `}</style>
      
      <GlobalAlertBanner />
      {children}
      
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: 'rgb(15 23 42)',
            border: '1px solid rgb(51 65 85)',
            color: '#fff',
          },
        }}
      />
    </div>
  );
}
