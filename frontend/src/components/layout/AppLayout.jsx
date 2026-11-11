import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import { ConversationsProvider } from '../../context/ConversationsContext.jsx';

export default function AppLayout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <ConversationsProvider>
      <div className="app-shell">
        <Sidebar open={open} onClose={() => setOpen(false)} />
        <div className="app-main">
          <header className="topbar">
            <button className="btn btn-quiet" onClick={() => setOpen(true)} aria-label="Open menu">Menu</button>
            <span className="brand brand-inline">Marginalia</span>
          </header>
          <Outlet />
        </div>
      </div>
    </ConversationsProvider>
  );
}
