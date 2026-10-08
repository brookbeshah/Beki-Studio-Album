import React, { useEffect, useState } from 'react';
import { ActivityLog } from '../types';
import { getActivityLogs } from '../services/albumService';
import { History, Shield, RefreshCw } from 'lucide-react';
import { Button } from '../components/common/Button';

export const AdminActivityLogs: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await getActivityLogs(50);
      setLogs(data);
    } catch {
      console.error('Failed to load activity logs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E0D0]">
        <div>
          <span className="text-[11px] uppercase tracking-[0.3em] text-[#C8A96B] font-medium">
            Audit Trail
          </span>
          <h2
            className="font-serif text-3xl text-[#171717] font-normal tracking-wide mt-0.5"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            Activity & Security Logs
          </h2>
          <p className="text-xs text-[#77736B] font-light mt-1">
            Immutable log of all administrative actions, album updates, and media operations.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Refresh Logs
        </Button>
      </div>

      {isLoading ? (
        <div className="py-20 text-center">
          <p className="text-xs tracking-widest uppercase text-[#77736B] animate-pulse">
            Loading Activity Stream...
          </p>
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-[#FCFBF8] border border-[#E8E0D0] rounded-xs p-12 text-center">
          <p className="font-serif text-xl text-[#171717] mb-2 font-normal">
            No activity logged yet.
          </p>
          <p className="text-xs text-[#77736B] font-light">
            System actions and studio administrative operations will be cataloged here.
          </p>
        </div>
      ) : (
        <div className="bg-[#FCFBF8] border border-[#E8E0D0] rounded-xs overflow-hidden shadow-xs">
          <div className="divide-y divide-[#E8E0D0]">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-[#F8F6F0]/50 transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-full bg-[#171717] text-[#C8A96B] flex items-center justify-center shrink-0 mt-0.5">
                    <Shield className="w-4 h-4" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-bold text-[#171717] tracking-wider uppercase text-[10px] bg-[#EFECE4] px-2 py-0.5 rounded-xs">
                        {log.action.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[#A8A49C] text-[11px]">
                        Target: {log.targetType} {log.targetId ? `(${log.targetId})` : ''}
                      </span>
                    </div>

                    <p className="text-[#171717] font-medium leading-relaxed">
                      {log.details || 'System operation executed.'}
                    </p>

                    <p className="text-[11px] text-[#77736B] mt-0.5">
                      Actor: <span className="font-semibold">{log.actorName}</span> ({log.actorEmail})
                    </p>
                  </div>
                </div>

                <div className="text-[11px] text-[#A8A49C] self-end sm:self-center shrink-0 font-mono">
                  {new Date(log.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
