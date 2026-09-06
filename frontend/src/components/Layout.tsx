import { useState } from 'react';
import { Sidebar, HamburgerButton } from './Sidebar';
import { ToastContainer } from './Toast';
import { AssistantFab } from './AssistantFab';
import { AssistantPanel } from './AssistantPanel';
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';

export function Layout() {
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-porcelaine dark:bg-[#121416] transition-colors duration-200">
      <HamburgerButton onClick={() => setSidebarOpen(true)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="lg:ml-sidebar min-h-screen">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="p-4 sm:p-6 lg:p-8"
        >
          <Outlet />
        </motion.div>
      </main>

      <AssistantFab
        onClick={() => setAssistantOpen(true)}
        isOpen={assistantOpen}
      />
      <AssistantPanel
        isOpen={assistantOpen}
        onClose={() => setAssistantOpen(false)}
        onMinimize={() => setAssistantOpen(false)}
      />

      <ToastContainer />
    </div>
  );
}
