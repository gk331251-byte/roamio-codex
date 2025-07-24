import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import LiveQuestMap from './LiveQuestMap';
import GroupMemberList from './GroupMemberList';
import { getGroupQuest, getQuest, trackStopVisit } from '../lib/api';
import { decode } from '@googlemaps/polyline-codec';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { getAuth } from 'firebase/auth';

export default function GroupQuestView() {
  const { groupId } = useParams();
  const [quest, setQuest] = useState(null);
  const [group, setGroup] = useState(null);
  const [polyline, setPolyline] = useState([]);
  const [xpMsg, setXpMsg] = useState('');

  useEffect(() => {
    if (!groupId) return;
    const unsub = onSnapshot(doc(db, 'group_quests', groupId), (snap) => {
      const data = snap.data();
      if (data) setGroup(data);
    });
    return () => unsub();
  }, [groupId]);

  useEffect(() => {
    if (!group) return;
    getQuest(group.questId)
      .then((q) => {
        const data = q.fields ? q : q; // handle raw doc or decoded
        const places = (data.places || data.fields?.places?.arrayValue?.values?.map((v) => ({
          lat: parseFloat(v.mapValue.fields.lat.doubleValue || v.mapValue.fields.lat.integerValue),
          lng: parseFloat(v.mapValue.fields.lng.doubleValue || v.mapValue.fields.lng.integerValue),
          name: v.mapValue.fields.name.stringValue,
        })));
        if (Array.isArray(data.places)) setQuest({ ...data, places });
        else setQuest({ id: group.questId, places });
        const poly = data.route?.polyline || data.fields?.route?.mapValue?.fields?.polyline?.stringValue;
        if (poly) {
          setPolyline(decode(poly).map(([lat,lng])=>({lat,lng})));
        }
      })
      .catch((e) => console.error('quest fetch error', e));
  }, [group]);

  const auth = getAuth();
  const me = auth.currentUser;
  const visitedIndex = group?.progress?.[me?.uid] ? group.progress[me.uid].length : 0;

  const handleVisit = async () => {
    if (!group || !quest || !me) return;
    try {
      const res = await trackStopVisit(groupId, me.uid, visitedIndex);
      if (res?.xp) {
        setXpMsg(`+${res.xp} XP`);
        setTimeout(() => setXpMsg(''), 2000);
      }
    } catch (err) {
      console.error('track visit error', err);
    }
  };

  return (
    <div className="p-4 space-y-4">
      {group && quest ? (
        <>
          <div>
            <GroupMemberList members={group.members} progress={group.progress} total={quest.places.length} />
          </div>
          <LiveQuestMap
            stops={quest.places}
            visitedIndex={visitedIndex}
            polylinePoints={polyline}
            groupProgress={group.progress}
            members={group.members}
          />
          <div className="text-center mt-2">
            <button
              onClick={handleVisit}
              className="px-4 py-2 rounded bg-green-600 text-white"
            >
              Mark as Visited
            </button>
            {xpMsg && <div className="mt-1 text-sm text-purple-700">{xpMsg}</div>}
          </div>
        </>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
}
