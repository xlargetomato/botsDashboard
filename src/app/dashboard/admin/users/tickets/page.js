'use client';

import { useState, useEffect } from 'react';
import { FiSearch, FiFilter, FiChevronDown, FiChevronUp, FiMessageSquare } from 'react-icons/fi';
import AdminLayout from '@/components/layouts/AdminLayout';
import { useTranslation } from '@/lib/i18n/config';
import AdminTicketList from '@/components/support/admin/AdminTicketList';
import AdminSupportChat from '@/components/support/admin/AdminSupportChat';

export default function AdminTicketsPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [view, setView] = useState('list'); // 'list' or 'chat'

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/support/tickets');
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

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleFilterStatus = (e) => {
    setFilterStatus(e.target.value);
  };

  const handleSelectTicket = (ticket) => {
    setSelectedTicket(ticket);
    setView('chat');
  };

  const handleBackToList = () => {
    setView('list');
    setSelectedTicket(null);
    // Refresh tickets list when returning
    fetchTickets();
  };

  const handleUpdateTicket = async (ticketId, status) => {
    try {
      const response = await fetch('/api/admin/support/tickets', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketId,
          status,
        }),
      });

      if (response.ok) {
        // Update the ticket in the local state
        setTickets(prev =>
          prev.map(ticket =>
            ticket.id === ticketId ? { ...ticket, status } : ticket
          )
        );
        return true;
      } else {
        const error = await response.json();
        setError(error.error || 'Failed to update ticket');
        return false;
      }
    } catch (error) {
      setError('Failed to update ticket');
      return false;
    }
  };

  // Apply filters and sorting
  const filteredTickets = tickets.filter(ticket => {
    // Status filter
    if (filterStatus !== 'all' && ticket.status !== filterStatus) {
      return false;
    }

    // Search filter - search in subject, user email, or ticket ID
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        (ticket.subject && ticket.subject.toLowerCase().includes(term)) ||
        (ticket.user_email && ticket.user_email.toLowerCase().includes(term)) ||
        (ticket.id && ticket.id.toString().includes(term))
      );
    }

    return true;
  });

  // Sort tickets
  const sortedTickets = [...filteredTickets].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];

    // Handle dates
    if (sortField === 'created_at' || sortField === 'updated_at' || sortField === 'last_message_at') {
      aValue = new Date(aValue || 0).getTime();
      bValue = new Date(bValue || 0).getTime();
    }

    // Handle strings
    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
    }
    if (typeof bValue === 'string') {
      bValue = bValue.toLowerCase();
    }

    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  return (
    <AdminLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="sm:flex sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-cairo">
            {isRtl ? 'إدارة تذاكر الدعم الفني' : 'Support Tickets Management'}
          </h1>
        </div>

        {view === 'list' && (
          <>
            <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="relative rounded-md shadow-sm max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiSearch className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 dark:text-white font-cairo"
                  placeholder={isRtl ? "البحث في التذاكر..." : "Search tickets..."}
                  value={searchTerm}
                  onChange={handleSearch}
                />
              </div>

              <div className="flex items-center space-x-4 rtl:space-x-reverse">
                <div className="relative inline-block text-left">
                  <div className="flex items-center">
                    <FiFilter className="mr-2 rtl:ml-2 rtl:mr-0 h-5 w-5 text-gray-500 dark:text-gray-400" />
                    <select
                      className="block pl-3 pr-10 py-2 text-base border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-cairo"
                      value={filterStatus}
                      onChange={handleFilterStatus}
                    >
                      <option value="all" className="font-cairo">{isRtl ? 'جميع الحالات' : 'All Statuses'}</option>
                      <option value="open" className="font-cairo">{isRtl ? 'مفتوح' : 'Open'}</option>
                      <option value="closed" className="font-cairo">{isRtl ? 'مغلق' : 'Closed'}</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <AdminTicketList 
                tickets={sortedTickets} 
                loading={loading}
                error={error}
                onSelectTicket={handleSelectTicket}
                onUpdateTicket={handleUpdateTicket}
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
                isRtl={isRtl}
              />
            </div>
          </>
        )}

        {view === 'chat' && selectedTicket && (
          <div className="mt-6">
            <button 
              onClick={handleBackToList}
              className="mb-4 flex items-center text-blue-500 hover:text-blue-600 font-cairo"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 rtl:ml-1 rtl:mr-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              {isRtl ? 'العودة إلى قائمة التذاكر' : 'Back to tickets list'}
            </button>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
              <div className="mb-4 pb-4 border-b dark:border-gray-700">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-semibold font-cairo text-gray-900 dark:text-white">
                      {selectedTicket.subject}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {isRtl ? 'من: ' : 'From: '} 
                      <span className="font-medium">{selectedTicket.user_email || selectedTicket.user_name}</span>
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {isRtl ? 'تاريخ: ' : 'Date: '} 
                      {new Date(selectedTicket.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center">
                    <span className={`px-2 py-1 text-xs rounded-full font-cairo ${
                      selectedTicket.status === 'open'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                    }`}>
                      {selectedTicket.status === 'open'
                        ? isRtl ? 'مفتوح' : 'Open'
                        : isRtl ? 'مغلق' : 'Closed'}
                    </span>
                    {selectedTicket.status === 'open' ? (
                      <button
                        onClick={() => handleUpdateTicket(selectedTicket.id, 'closed')}
                        className="ml-2 rtl:mr-2 rtl:ml-0 text-sm text-red-500 hover:text-red-600 font-cairo"
                      >
                        {isRtl ? 'إغلاق التذكرة' : 'Close Ticket'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUpdateTicket(selectedTicket.id, 'open')}
                        className="ml-2 rtl:mr-2 rtl:ml-0 text-sm text-green-500 hover:text-green-600 font-cairo"
                      >
                        {isRtl ? 'إعادة فتح التذكرة' : 'Reopen Ticket'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <AdminSupportChat 
                ticketId={selectedTicket.id} 
                isRtl={isRtl}
              />
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
