'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n/config';

export default function TicketList({ onSelectTicket, onNewTicket, isRtl }) {
  const { t } = useTranslation();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const response = await fetch('/api/support/tickets');
        if (response.ok) {
          const data = await response.json();
          setTickets(data.tickets);
        } else {
          const error = await response.json();
          setError(error.error || 'Failed to load tickets');
        }
      } catch (error) {
        setError('Failed to load tickets');
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, []);

  const handleCloseTicket = async (ticketId) => {
    try {
      const response = await fetch('/api/support/tickets', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketId,
          status: 'closed',
        }),
      });

      if (response.ok) {
        setTickets(prev =>
          prev.map(ticket =>
            ticket.id === ticketId ? { ...ticket, status: 'closed' } : ticket
          )
        );
      } else {
        const error = await response.json();
        setError(error.error || 'Failed to close ticket');
      }
    } catch (error) {
      setError('Failed to close ticket');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold font-cairo text-gray-900 dark:text-white">
          {isRtl ? 'تذاكر الدعم' : 'Support Tickets'}
        </h2>
        <button
          onClick={onNewTicket}
          className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-cairo"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{isRtl ? 'تذكرة جديدة' : 'New Ticket'}</span>
        </button>
      </div>

      {error && (
        <div className="p-4 text-center text-red-500 dark:text-red-400 font-cairo">
          {error}
        </div>
      )}

      {tickets.length === 0 ? (
        <div className="text-center p-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-gray-600 dark:text-gray-400 font-cairo">
            {isRtl ? 'لا توجد تذاكر دعم' : 'No support tickets'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onSelectTicket(ticket)}
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="font-semibold font-cairo text-gray-900 dark:text-white">
                    {ticket.subject}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {new Date(ticket.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <span
                    className={`px-2 py-1 text-xs rounded-full font-cairo ${
                      ticket.status === 'open'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                    }`}
                  >
                    {ticket.status === 'open'
                      ? isRtl ? 'مفتوح' : 'Open'
                      : isRtl ? 'مغلق' : 'Closed'}
                  </span>
                  {ticket.status === 'open' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCloseTicket(ticket.id);
                      }}
                      className="text-sm text-red-500 hover:text-red-600 font-cairo"
                    >
                      {isRtl ? 'إغلاق' : 'Close'}
                    </button>
                  )}
                </div>
              </div>
              {ticket.message_count > 0 && (
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 font-cairo">
                  {ticket.message_count}{' '}
                  {isRtl
                    ? ticket.message_count === 1
                      ? 'رسالة'
                      : 'رسائل'
                    : ticket.message_count === 1
                    ? 'message'
                    : 'messages'}
                  {ticket.last_message_at &&
                    ` • ${new Date(ticket.last_message_at).toLocaleTimeString()}`}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
