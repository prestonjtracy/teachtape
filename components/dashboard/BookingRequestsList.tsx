'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { BookingRequestWithDetails } from '@/types/db';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';

interface BookingRequestsListProps {
  coachId: string;
  onRequestUpdate?: () => void;
}

interface BookingRequestWithLastMessage extends BookingRequestWithDetails {
  last_message?: {
    body: string;
    created_at: string;
  } | null;
}

export default function BookingRequestsList({ coachId, onRequestUpdate }: BookingRequestsListProps) {
  const [requests, setRequests] = useState<BookingRequestWithLastMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = createClient();

  useEffect(() => {
    fetchRequests();

    // Subscribe to real-time updates for booking requests
    const channel = supabase
      .channel('booking_requests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'booking_requests',
          filter: `coach_id=eq.${coachId}`,
        },
        () => {
          console.log('Booking request updated, refetching...');
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [coachId, supabase]);

  async function fetchRequests() {
    try {
      console.log('🔍 [BookingRequestsList] Fetching requests via API...');

      // Use server-side API to bypass RLS issues
      const response = await fetch('/api/dashboard/booking-requests', {
        credentials: 'include'
      });

      if (!response.ok) {
        console.error('❌ [BookingRequestsList] API error:', response.status);
        setError('Failed to load booking requests');
        return;
      }

      const data = await response.json();
      console.log('✅ [BookingRequestsList] Successfully fetched', data.requests?.length || 0, 'requests');

      setRequests(data.requests || []);
      setError(null);
    } catch (err) {
      console.error('Error in fetchRequests:', err);
      setError('Failed to load booking requests');
    } finally {
      setLoading(false);
    }
  }

  async function handleAcceptRequest(requestId: string) {
    setProcessingRequest(requestId);
    try {
      const response = await fetch(`/api/requests/${requestId}/accept`, {
        method: 'POST',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to accept request');
      }

      console.log('Request accepted successfully:', result);
      
      // Remove the request from the list since it's no longer pending
      setRequests(prev => prev.filter(req => req.id !== requestId));
      
      // Notify parent component
      onRequestUpdate?.();
      
      // You can add a toast notification here
      alert('Request accepted successfully!');

    } catch (error) {
      console.error('Error accepting request:', error);
      alert(`Failed to accept request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setProcessingRequest(null);
    }
  }

  async function handleDeclineRequest(requestId: string) {
    if (!confirm('Are you sure you want to decline this booking request?')) {
      return;
    }

    setProcessingRequest(requestId);
    try {
      const response = await fetch(`/api/requests/${requestId}/decline`, {
        method: 'POST',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to decline request');
      }

      console.log('Request declined successfully:', result);
      
      // Remove the request from the list since it's no longer pending
      setRequests(prev => prev.filter(req => req.id !== requestId));
      
      // Notify parent component
      onRequestUpdate?.();
      
      // You can add a toast notification here
      alert('Request declined successfully.');

    } catch (error) {
      console.error('Error declining request:', error);
      alert(`Failed to decline request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setProcessingRequest(null);
    }
  }

  const formatTime = (dateString: string, timezone: string) => {
    const date = new Date(dateString);
    const timeStr = date.toLocaleTimeString([], { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    const dateStr = date.toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
    return `${dateStr}, ${timeStr} (${timezone})`;
  };

  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  if (loading) {
    return (
      <Card>
        <CardBody className="p-6 text-center">
          <div className="animate-spin h-8 w-8 border-2 border-brand-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-500">Loading booking requests...</p>
        </CardBody>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardBody className="p-6 text-center">
          <div className="text-red-500 mb-4">⚠️ {error}</div>
          <Button onClick={fetchRequests} variant="outline">
            Try Again
          </Button>
        </CardBody>
      </Card>
    );
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardBody className="p-6 text-center text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4m-4 8a2 2 0 110-4 2 2 0 010 4zm0 0v3m-4-3a4 4 0 108 0v-3m-4-3V9" />
          </svg>
          <p className="font-medium mb-2">No pending requests</p>
          <p className="text-sm">New booking requests will appear here.</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <Card key={request.id} className="border-l-4 border-l-blue-500">
          <CardBody className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* Request Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-sm">
                      {request.athlete?.full_name?.charAt(0) || '?'}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {request.athlete?.full_name || 'Unknown Athlete'}
                    </h3>
                    <p className="text-sm text-gray-500">{request.listing?.title}</p>
                  </div>
                  <Badge variant="success" className="ml-auto lg:hidden">
                    {formatCurrency(request.listing?.price_cents || 0)}
                  </Badge>
                </div>

                <div className="text-sm text-gray-600 space-y-1">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{formatTime(request.proposed_start, request.timezone)}</span>
                  </div>
                  
                  {request.last_message && (
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.959 8.959 0 01-4.906-1.476L3 21l1.476-5.094A8.959 8.959 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
                      </svg>
                      <span className="truncate max-w-md">{request.last_message.body}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Price and Actions */}
              <div className="flex items-center gap-3 lg:flex-col lg:items-end">
                <Badge variant="success" className="hidden lg:block">
                  {formatCurrency(request.listing?.price_cents || 0)}
                </Badge>
                
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleDeclineRequest(request.id)}
                    disabled={processingRequest === request.id}
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-600 hover:bg-red-50"
                  >
                    {processingRequest === request.id ? (
                      <div className="animate-spin h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full"></div>
                    ) : (
                      'Decline'
                    )}
                  </Button>
                  
                  <Button
                    onClick={() => handleAcceptRequest(request.id)}
                    disabled={processingRequest === request.id}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {processingRequest === request.id ? (
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    ) : (
                      'Accept'
                    )}
                  </Button>
                </div>

                {request.conversation_id && (
                  <Link 
                    href={`/messages/${request.conversation_id}`}
                    className="text-sm text-blue-600 hover:text-blue-800 underline lg:mt-2"
                  >
                    View Chat →
                  </Link>
                )}
              </div>
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}