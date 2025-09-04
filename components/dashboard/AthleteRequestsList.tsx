'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface BookingRequest {
  id: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  proposed_start: string;
  proposed_end: string;
  timezone: string;
  created_at: string;
  listing: {
    id: string;
    title: string;
    price_cents: number;
  };
  coach: {
    id: string;
    full_name: string;
  };
  conversation_id: string;
}

interface Props {
  athleteId: string;
}

export default function AthleteRequestsList({ athleteId }: Props) {
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchRequests();
    
    // Set up real-time subscription
    const channel = supabase
      .channel(`athlete_requests:${athleteId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'booking_requests',
        filter: `athlete_id=eq.${athleteId}`,
      }, () => {
        fetchRequests();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [athleteId]);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('booking_requests')
        .select(`
          id,
          status,
          proposed_start,
          proposed_end,
          timezone,
          created_at,
          conversation_id,
          listing:listings!inner(id, title, price_cents),
          coach:profiles!booking_requests_coach_id_fkey(id, full_name)
        `)
        .eq('athlete_id', athleteId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching requests:', error);
        return;
      }

      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  
  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'declined':
        return 'bg-red-100 text-red-800';
      case 'expired':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'accepted':
        return '✅';
      case 'declined':
        return '❌';
      case 'expired':
        return '⏰';
      default:
        return '❓';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="p-12 text-center">
          <div className="text-4xl mb-4">📋</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No booking requests yet
          </h3>
          <p className="text-gray-600 mb-6">
            Browse coaches and request sessions to see them here.
          </p>
          <Link
            href="/coaches"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            Browse Coaches
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="divide-y divide-gray-200">
        {requests.map((request) => (
          <div key={request.id} className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-medium text-gray-900 truncate">
                    {request.listing.title}
                  </h3>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                    {getStatusIcon(request.status)} {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                  </span>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Coach:</span>
                    {request.coach.full_name}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Price:</span>
                    {formatPrice(request.listing.price_cents)}
                  </div>
                </div>

                <div className="text-sm text-gray-600 mb-3">
                  <div className="font-medium mb-1">Proposed Time:</div>
                  <div>
                    {formatDateTime(request.proposed_start)} - {formatDateTime(request.proposed_end)}
                    <span className="ml-2 text-gray-500">({request.timezone})</span>
                  </div>
                </div>

                <div className="text-xs text-gray-500">
                  Requested {formatDateTime(request.created_at)}
                </div>
              </div>

              <div className="ml-4 flex flex-col gap-2">
                <Link
                  href={`/messages/${request.conversation_id}`}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                >
                  💬 Chat
                </Link>
                
                {request.status === 'accepted' && (
                  <div className="text-xs text-green-600 font-medium text-center">
                    Session Confirmed!
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}