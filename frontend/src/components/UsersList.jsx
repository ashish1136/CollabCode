import React from 'react';
import { Users } from 'lucide-react';

const UsersList = ({ users, currentUser }) => {
  return (
    <div className="p-4 shrink-0">
      <div className="flex items-center gap-2 mb-3 text-gray-400 text-xs font-bold uppercase tracking-wider">
        <Users size={14} />
        <span>Live Session ({users.length})</span>
      </div>
      <div className="space-y-2">
        {users.map((user) => (
          <div key={user.id} className="flex items-center gap-3 bg-gray-800/40 p-2 rounded-lg border border-gray-700/50 hover:bg-gray-800/80 transition-colors">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white text-sm shadow-inner">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col flex-1 truncate">
              <span className="text-gray-200 text-sm font-medium truncate">
                {user.username} {user.id === currentUser && <span className="text-gray-500 font-normal ml-1">(You)</span>}
              </span>
              <span className="text-green-500/80 text-[10px] uppercase font-bold flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> Connected
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UsersList;
