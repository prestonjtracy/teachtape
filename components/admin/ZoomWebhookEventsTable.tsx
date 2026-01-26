'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface WebhookEvent {
  id: string;
  zoom_meeting_id: string;
  booking_id: string | null;
  event_type: string;
  participant_name: string | null;
  participant_email: string | null;
  participant_user_id: string | null;
  occurred_at: string;
  created_at: string;
  raw_data: any;
}

export default function ZoomWebhookEventsTable() {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const eventsPerPage = 50;

  useEffect(() => {
    fetchEvents();
  }, [currentPage]);

  const fetchEvents = async () => {
    try {
      setLoading(true);

      const supabase = createClient();

      // Verify admin access first
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Authentication required');
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('auth_user_id', user.id)
        .single();

      if (profileError || profile?.role !== 'admin') {
        throw new Error('Admin access required');
      }

      // Get total count
      const { count, error: countError } = await supabase
        .from('zoom_webhook_events')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        throw new Error(`Count error: ${countError.message}`);
      }

      setTotalCount(count || 0);

      // Fetch paginated events
      const from = (currentPage - 1) * eventsPerPage;
      const to = from + eventsPerPage - 1;

      const { data: webhookEvents, error: eventsError } = await supabase
        .from('zoom_webhook_events')
        .select('*')
        .order('occurred_at', { ascending: false })
        .range(from, to);

      if (eventsError) {
        throw new Error(`Events error: ${eventsError.message}`);
      }

      setEvents(webhookEvents || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching webhook events:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch events');
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

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case 'meeting.started':
        return 'bg-green-100 text-green-800';
      case 'meeting.ended':
        return 'bg-red-100 text-red-800';
      case 'meeting.participant_joined':
        return 'bg-blue-100 text-blue-800';
      case 'meeting.participant_left':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getEventTypeIcon = (eventType: string) => {
    switch (eventType) {
      case 'meeting.started':
        return '🟢';
      case 'meeting.ended':
        return '🔴';
      case 'meeting.participant_joined':
        return '👤';
      case 'meeting.participant_left':
        return '👋';
      default:
        return '📋';
    }
  };

  const formatEventType = (eventType: string) => {
    return eventType
      .replace('meeting.', '')
      .replace('participant_', '')
      .replace(/_/g, ' ')
      .toUpperCase();
  };

  const totalPages = Math.ceil(totalCount / eventsPerPage);

  if (loading && events.length === 0) {
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
            <div className="text-red-500 mb-2">Error loading webhook events</div>
            <div className="text-sm text-gray-500">{error}</div>
            <button
              onClick={fetchEvents}
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
            Zoom Webhook Events ({totalCount.toLocaleString()})
          </h3>
          <button
            onClick={fetchEvents}
            disabled={loading}
            className="bg-blue-600 text-white px-3 py-1 text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Events received from Zoom webhooks (meeting start/end, participant join/leave)
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Event
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Meeting ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Participant
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Booking
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Occurred At
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Received At
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {events.map((event) => (
              <tr key={event.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEventTypeColor(event.event_type)}`}>
                    {getEventTypeIcon(event.event_type)} {formatEventType(event.event_type)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-mono text-gray-900">
                    {event.zoom_meeting_id}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {event.participant_name ? (
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {event.participant_name}
                      </div>
                      {event.participant_email && (
                        <div className="text-sm text-gray-500">
                          {event.participant_email}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {event.booking_id ? (
                    <div className="text-sm font-mono text-blue-600">
                      {event.booking_id.substring(0, 8)}...
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">No booking linked</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {formatDateTime(event.occurred_at)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {formatDateTime(event.created_at)}
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
                  Showing <span className="font-medium">{((currentPage - 1) * eventsPerPage) + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * eventsPerPage, totalCount)}
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

      {events.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg mb-2">No webhook events</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Zoom webhook events recorded yet</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Webhook events will appear here when Zoom sends notifications about meeting start/end and participant join/leave events.
            Make sure your Zoom app webhook URL is configured correctly.
          </p>
          <div className="mt-4 p-4 bg-gray-50 rounded-lg text-left max-w-lg mx-auto">
            <p className="text-sm font-medium text-gray-700 mb-2">Troubleshooting:</p>
            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>Check if webhook URL is set in Zoom App Marketplace</li>
              <li>Verify ZOOM_WEBHOOK_SECRET_TOKEN env var is set</li>
              <li>Test the endpoint: GET /api/zoom/webhook</li>
              <li>Check server logs for webhook errors</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
