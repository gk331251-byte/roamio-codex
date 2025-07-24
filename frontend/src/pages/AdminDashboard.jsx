import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import {
  collection,
  collectionGroup,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  getCountFromServer
} from 'firebase/firestore';
import { db } from '../firebase';

export default function AdminDashboard() {
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return navigate('/');
    (async () => {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (!snap.exists() || !snap.data().isAdmin) {
        navigate('/');
        return;
      }
      const reportQuery = query(
        collection(db, 'reports'),
        where('resolved', '==', false)
      );
      const [reportSnap, usersSnap, questsSnap, pendingSnap] = await Promise.all([
        getDocs(reportQuery),
        getCountFromServer(collection(db, 'users')),
        getCountFromServer(collectionGroup(db, 'quests')),
        getCountFromServer(reportQuery)
      ]);
      setReports(reportSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setStats({
        totalUsers: usersSnap.data().count,
        totalQuests: questsSnap.data().count,
        pendingReports: pendingSnap.data().count
      });
      setLoading(false);
    })();
  }, [navigate]);

  const handleResolve = async (id) => {
    await updateDoc(doc(db, 'reports', id), { resolved: true });
    setReports((r) => r.filter((rep) => rep.id !== id));
    setStats((s) => ({ ...s, pendingReports: s.pendingReports - 1 }));
  };

  const handleDelete = async (questId, type) => {
    if (!window.confirm('Delete this quest?')) return;
    await deleteDoc(doc(db, type === 'custom' ? 'custom_quests' : 'quests', questId));
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!stats) return <div className="p-6">Access denied</div>;

  return (
    <div className="p-6 space-y-6 text-[#0e1b0e]">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded shadow">
          <p className="text-xs text-gray-500">Active Users</p>
          <p className="text-xl font-bold">{stats.totalUsers}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <p className="text-xs text-gray-500">Total Quests</p>
          <p className="text-xl font-bold">{stats.totalQuests}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <p className="text-xs text-gray-500">Pending Reports</p>
          <p className="text-xl font-bold">{stats.pendingReports}</p>
        </div>
      </div>
      <div>
        <h2 className="font-semibold mb-2">Active Reports</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-200">
                <th className="px-2 py-1 text-left">Quest ID</th>
                <th className="px-2 py-1 text-left">Type</th>
                <th className="px-2 py-1 text-left">Reason</th>
                <th className="px-2 py-1 text-left">Reported By</th>
                <th className="px-2 py-1 text-left">Timestamp</th>
                <th className="px-2 py-1">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id} className="border-b">
                  <td className="px-2 py-1">{r.questId}</td>
                  <td className="px-2 py-1 capitalize">{r.type || 'standard'}</td>
                  <td className="px-2 py-1">{r.reason}</td>
                  <td className="px-2 py-1">{r.reportedBy}</td>
                  <td className="px-2 py-1">{new Date(r.timestamp).toLocaleString()}</td>
                  <td className="px-2 py-1 space-x-2">
                    <button onClick={() => handleResolve(r.id)} className="bg-green-600 text-white px-2 py-1 rounded text-xs">Resolve</button>
                    <button onClick={() => handleDelete(r.questId, r.type)} className="bg-red-600 text-white px-2 py-1 rounded text-xs">Delete Quest</button>
                  </td>
                </tr>
              ))}
              {reports.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center py-2">
                    No pending reports.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

