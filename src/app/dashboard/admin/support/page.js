'use client';

import { useState, useEffect } from 'react';
import { FiSearch, FiFilter, FiChevronDown, FiChevronUp, FiMessageSquare } from 'react-icons/fi';
import AdminLayout from '@/components/layouts/AdminLayout';
import { useTranslation } from '@/lib/i18n/config';
import AdminTicketList from '@/components/support/admin/AdminTicketList';
import AdminSupportChat from '@/components/support/admin/AdminSupportChat';

export default function AdminSupportPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('asc'); // Changed to 'asc' for FIFO (oldest first)
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
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <h1 className="text-2xl font-semibold font-cairo text-gray-900 dark:text-white">
                  {isRtl ? 'إدارة الدعم' : 'Support Management'}
                </h1>

                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <div className="relative flex-grow">
                    <input
                      type="text"
                      placeholder={isRtl ? 'البحث عن تذاكر...' : 'Search tickets...'}
                      className="w-full py-2 pl-10 rtl:pr-10 rtl:pl-4 pr-4 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-cairo"
                      value={searchTerm}
                      onChange={handleSearch}
                    />
                    <div className="absolute left-3 rtl:right-3 rtl:left-auto top-2.5 text-gray-500 dark:text-gray-400">
                      <FiSearch className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="relative min-w-[150px]">
                    <select
                      value={filterStatus}
                      onChange={handleFilterStatus}
                      className="w-full py-2 pl-3 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-cairo"
                    >
                      <option value="all">{isRtl ? 'جميع الحالات' : 'All Statuses'}</option>
                      <option value="open">{isRtl ? 'مفتوحة' : 'Open'}</option>
                      <option value="closed">{isRtl ? 'مغلقة' : 'Closed'}</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 rtl:left-0 rtl:right-auto flex items-center px-2 pointer-events-none text-gray-500 dark:text-gray-400">
                      <FiChevronDown className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Mobile sorting options */}
              <div className="md:hidden mb-4">
                <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 font-cairo">
                    {isRtl ? 'ترتيب حسب:' : 'Sort by:'}  
                  </span>
                  <select 
                    className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-sm font-cairo"
                    value={sortField}
                    onChange={(e) => {
                      setSortField(e.target.value);
                      setSortDirection('asc');
                    }}
                  >
                    <option value="created_at">{isRtl ? 'تاريخ الإنشاء' : 'Created Date'}</option>
                    <option value="last_message_at">{isRtl ? 'آخر تحديث' : 'Last Updated'}</option>
                    <option value="subject">{isRtl ? 'الموضوع' : 'Subject'}</option>
                    <option value="status">{isRtl ? 'الحالة' : 'Status'}</option>
                  </select>
                  <button 
                    onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    {sortDirection === 'asc' ? (
                      <FiChevronUp className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                    ) : (
                      <FiChevronDown className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                    )}
                  </button>
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
