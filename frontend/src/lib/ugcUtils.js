import { getCreatorProfile, getUserUGCSubmissions } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export async function fetchCreatorStats(uid) {
  const profile = await getCreatorProfile(uid);
  const submissions = await getUserUGCSubmissions(uid);
  return { profile, submissions };
}

export async function fetchUGCAnalytics(week) {
  if (!week) return null;
  const snap = await getDoc(doc(db, 'ugc_analytics', week));
  return snap.exists() ? snap.data() : null;
}

export function exportAnalyticsCsv(data) {
  if (!data || !data.topContributors) return;
  const rows = data.topContributors.map((c) =>
    [c.uid, c.displayName, c.submissionCount].join(',')
  );
  const csv = ['uid,displayName,submissionCount', ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ugc-analytics.csv';
  a.click();
  URL.revokeObjectURL(url);
}
