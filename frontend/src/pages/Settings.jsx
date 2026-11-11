import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { changePassword, getConfig, updateProfile } from '../api/auth.api.js';
import { errorMessage } from '../api/axios.js';

export default function Settings() {
  const { user, setUser, logout } = useAuth();
  const [name, setName] = useState(user.name);
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [config, setConfig] = useState(null);
  const [notice, setNotice] = useState({ profile: '', password: '' });

  useEffect(() => { getConfig().then(setConfig).catch(() => {}); }, []);

  const saveProfile = async (e) => {
    e.preventDefault();
    try {
      setUser(await updateProfile({ name }));
      setNotice((n) => ({ ...n, profile: 'Name updated.' }));
    } catch (err) { setNotice((n) => ({ ...n, profile: errorMessage(err) })); }
  };
  const savePassword = async (e) => {
    e.preventDefault();
    try {
      await changePassword(pw);
      setPw({ currentPassword: '', newPassword: '' });
      setNotice((n) => ({ ...n, password: 'Password changed.' }));
    } catch (err) { setNotice((n) => ({ ...n, password: errorMessage(err) })); }
  };

  return (
    <main className="page page-narrow">
      <header className="page-head"><div><h1>Settings</h1><p className="muted">{user.email}</p></div></header>

      <form className="panel" onSubmit={saveProfile}>
        <h2>Profile</h2>
        <label>Name<input value={name} maxLength={80} required onChange={(e) => setName(e.target.value)} /></label>
        <div className="row-gap"><button className="btn btn-primary">Save name</button><span role="status" className="muted">{notice.profile}</span></div>
      </form>

      <form className="panel" onSubmit={savePassword}>
        <h2>Password</h2>
        <label>Current password<input type="password" autoComplete="current-password" required value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} /></label>
        <label>New password<input type="password" autoComplete="new-password" minLength={8} required value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} /></label>
        <div className="row-gap"><button className="btn btn-primary">Change password</button><span role="status" className="muted">{notice.password}</span></div>
      </form>

      {config && (
        <section className="panel">
          <h2>How your documents are processed</h2>
          <dl className="facts">
            <dt>Chunking strategy</dt><dd>{config.chunking.strategy}</dd>
            <dt>Chunk size</dt><dd>{config.chunking.size} tokens</dd>
            <dt>Overlap</dt><dd>{config.chunking.overlap} tokens</dd>
            <dt>Passages used per answer</dt><dd>up to {config.retrieval.topK}</dd>
            <dt>Upload limit</dt><dd>{config.upload.maxFileSizeMb} MB per file</dd>
          </dl>
          <p className="muted">Chunking can be changed per upload on the upload page.</p>
        </section>
      )}

      <button className="btn" onClick={logout}>Log out</button>
    </main>
  );
}
