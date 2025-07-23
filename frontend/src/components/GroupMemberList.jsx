import React from 'react';

export default function GroupMemberList({ members = [], progress = {}, total = 0 }) {
  return (
    <ul className="text-sm space-y-1">
      {members.map((m) => {
        const count = (progress[m.userId] || []).length;
        return (
          <li key={m.userId} className="flex justify-between">
            <span>{m.displayName || m.userId}</span>
            <span>{count}/{total}</span>
          </li>
        );
      })}
    </ul>
  );
}
