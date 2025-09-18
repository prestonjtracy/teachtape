'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface ZoomLog {
  id: string;
  booking_id: string;
  action_type: 'start_meeting' | 'join_meeting';
  user_agent: string | null;
  ip_address: string | null;
  created_at: string;
  coach: {
    id: string;
    full_name: string;
  };
  athlete: {
    id: string;
    full_name: string;
  };
  booking: {
    id: string;
    listing_title: string;
    session_date: string;
  };
}

export default function ZoomLogsTable() {
  const [logs, setLogs] = useState<ZoomLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const logsPerPage = 50;

  const supabase = createClient();

  useEffect(() => {
    fetchLogs();
  }, [currentPage]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      
      // Get total count first
      const { count, error: countError } = await supabase
        .from('zoom_session_logs')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        throw countError;
      }

      setTotalCount(count || 0);

      // Get paginated logs with related data
      const { data, error } = await supabase
        .from('zoom_session_logs')
        .select(`
          id,
          booking_id,
          action_type,
          user_agent,
          ip_address,
          created_at,
          coach:coach_id(id, full_name),
          athlete:athlete_id(id, full_name),
          bookings!inner(
            id,
            listings!inner(title),
            booking_requests!inner(proposed_start)
          )
        `)
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * logsPerPage, currentPage * logsPerPage - 1);

      if (error) {
        throw error;
      }

      // Transform data to match expected structure
      const transformedData = (data || []).map(log => ({
        ...log,
        booking: {
          id: log.bookings?.id || '',
          listing_title: log.bookings?.listings?.title || 'Unknown',
          session_date: log.bookings?.booking_requests?.proposed_start || '',
        }
      }));

      setLogs(transformedData);
      setError(null);
    } catch (err) {
      console.error('Error fetching zoom logs:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getActionTypeColor = (actionType: string) => {
    switch (actionType) {
      case 'start_meeting':
        return 'bg-green-100 text-green-800';
      case 'join_meeting':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionTypeIcon = (actionType: string) => {
    switch (actionType) {
      case 'start_meeting':
        return '🎬';
      case 'join_meeting':
        return '🎥';
      default:
        return '📹';
    }
  };

  const totalPages = Math.ceil(totalCount / logsPerPage);

  if (loading && logs.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="p-6">
          <div className="text-center">
            <div className="text-red-500 mb-2">⚠️ Error loading zoom logs</div>
            <div className="text-sm text-gray-500">{error}</div>
            <button
              onClick={fetchLogs}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            Zoom Session Logs ({totalCount.toLocaleString()})
          </h3>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="bg-blue-600 text-white px-3 py-1 text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Coach
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Athlete
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Session
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Timestamp
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionTypeColor(log.action_type)}`}>
                    {getActionTypeIcon(log.action_type)} {log.action_type.replace('_', ' ').toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {log.coach?.full_name || 'Unknown'}
                  </div>
                  <div className="text-sm text-gray-500 font-mono text-xs">
                    {log.coach?.id?.substring(0, 8)}...
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {log.athlete?.full_name || 'Unknown'}
                  </div>
                  <div className="text-sm text-gray-500 font-mono text-xs">
                    {log.athlete?.id?.substring(0, 8)}...
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {log.booking?.listing_title || 'Unknown Session'}
                  </div>
                  {log.booking?.session_date && (
                    <div className="text-sm text-gray-500">
                      {formatDateTime(log.booking.session_date)}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {formatDateTime(log.created_at)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{((currentPage - 1) * logsPerPage) + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * logsPerPage, totalCount)}
                  </span>{' '}
                  of <span className="font-medium">{totalCount}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    const page = i + 1;
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === page
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </div>
      )}

      {logs.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg mb-2">📹</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No zoom logs yet</h3>
          <p className="text-gray-500">
            Zoom session logs will appear here when coaches and athletes click meeting buttons.
          </p>
        </div>
      )}
    </div>
  );
}