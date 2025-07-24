import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import LiveQuestMap from './LiveQuestMap';
import GroupMemberList from './GroupMemberList';
import { getGroupQuest, getQuest } from '../lib/api';
import { decode } from '@googlemaps/polyline-codec';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { getAuth } from 'firebase/auth';

export default function GroupQuestView() {
  const { groupId } = useParams();
  const [quest, setQuest] = useState(null);
  const [group, setGroup] = useState(null);
  const [polyline, setPolyline] = useState([]);

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
        </>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
}
