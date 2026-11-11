import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import ProtectedRoute from './components/layout/ProtectedRoute.jsx';
import AppLayout from './components/layout/AppLayout.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import DocumentLibrary from './pages/DocumentLibrary.jsx';
import DocumentUpload from './pages/DocumentUpload.jsx';
import Chat from './pages/Chat.jsx';
import Settings from './pages/Settings.jsx';

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="splash" role="status">Loading…</div>;
  return user ? <Navigate to="/" replace /> : children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/documents" element={<DocumentLibrary />} />
          <Route path="/documents/upload" element={<DocumentUpload />} />
          <Route path="/chat/:id?" element={<Chat />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
