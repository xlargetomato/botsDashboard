'use client';

import { FiChevronDown, FiChevronUp, FiTrash2 } from 'react-icons/fi';
import { useEffect, useState } from 'react';

export default function AdminTicketList({ 
  tickets, 
  loading, 
  error, 
  onSelectTicket, 
  onUpdateTicket,
  onDeleteTicket,
  sortField,
  sortDirection,
  onSort,
  isRtl 
}) {
  const [deleting, setDeleting] = useState(null);
  // Request notification permission when component loads
  useEffect(() => {
    // Check if browser supports notifications
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      // Request permission for notifications
      Notification.requestPermission();
    }
  }, []);
  const handleCloseTicket = async (e, ticketId) => {
    e.stopPropagation();
    await onUpdateTicket(ticketId, 'closed');
  };

  const handleReopenTicket = async (e, ticketId) => {
    e.stopPropagation();
    await onUpdateTicket(ticketId, 'open');
  };
  
  const handleDeleteTicket = async (e, ticketId) => {
    e.stopPropagation();
    if (window.confirm(isRtl ? 'هل أنت متأكد من حذف هذه التذكرة؟ لا يمكن التراجع عن هذا الإجراء.' : 'Are you sure you want to delete this ticket? This action cannot be undone.')) {
      setDeleting(ticketId);
      try {
        await onDeleteTicket(ticketId);
      } catch (error) {
        console.error('Error deleting ticket:', error);
        alert(isRtl ? 'فشل حذف التذكرة' : 'Failed to delete ticket');
      } finally {
        setDeleting(null);
      }
    }
  };

  const renderSortIcon = (field) => {
    if (sortField !== field) return null;
    
    return sortDirection === 'asc' 
      ? <FiChevronUp className="ml-1 rtl:mr-1 rtl:ml-0 h-4 w-4" />
      : <FiChevronDown className="ml-1 rtl:mr-1 rtl:ml-0 h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-500 dark:text-red-400 font-cairo">
        {error}
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="text-center p-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <p className="text-gray-600 dark:text-gray-400 font-cairo">
          {isRtl ? 'لا توجد تذاكر دعم' : 'No support tickets found'}
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Desktop view - Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th 
                scope="col" 
                className="px-6 py-3 text-left rtl:text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                onClick={() => onSort('id')}
              >
                <div className="flex items-center">
                  <span className="font-cairo">{isRtl ? 'رقم التذكرة' : 'Ticket ID'}</span>
                  {renderSortIcon('id')}
                </div>
              </th>
              <th 
                scope="col" 
                className="px-6 py-3 text-left rtl:text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                onClick={() => onSort('subject')}
              >
                <div className="flex items-center">
                  <span className="font-cairo">{isRtl ? 'الموضوع' : 'Subject'}</span>
                  {renderSortIcon('subject')}
                </div>
              </th>
              <th 
                scope="col" 
                className="px-6 py-3 text-left rtl:text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                onClick={() => onSort('user_email')}
              >
                <div className="flex items-center">
                  <span className="font-cairo">{isRtl ? 'المستخدم' : 'User'}</span>
                  {renderSortIcon('user_email')}
                </div>
              </th>
              <th 
                scope="col" 
                className="px-6 py-3 text-left rtl:text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                onClick={() => onSort('created_at')}
              >
                <div className="flex items-center">
                  <span className="font-cairo">{isRtl ? 'تاريخ الإنشاء' : 'Created'}</span>
                  {renderSortIcon('created_at')}
                </div>
              </th>
              <th 
                scope="col" 
                className="px-6 py-3 text-left rtl:text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                onClick={() => onSort('last_message_at')}
              >
                <div className="flex items-center">
                  <span className="font-cairo">{isRtl ? 'آخر رسالة' : 'Last Message'}</span>
                  {renderSortIcon('last_message_at')}
                </div>
              </th>
              <th 
                scope="col" 
                className="px-6 py-3 text-left rtl:text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                <div className="flex items-center">
                  <span className="font-cairo">{isRtl ? 'الإشعارات' : 'Notifications'}</span>
                </div>
              </th>
              <th 
                scope="col" 
                className="px-6 py-3 text-left rtl:text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                onClick={() => onSort('status')}
              >
                <div className="flex items-center">
                  <span className="font-cairo">{isRtl ? 'الحالة' : 'Status'}</span>
                  {renderSortIcon('status')}
                </div>
              </th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <span className="font-cairo">{isRtl ? 'الإجراءات' : 'Actions'}</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
            {tickets.map((ticket) => (
              <tr 
                key={ticket.id} 
                className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                onClick={() => onSelectTicket(ticket)}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  #{ticket.id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-cairo">
                  {ticket.subject}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {ticket.user_email || ticket.user_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {new Date(ticket.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                  {ticket.last_message_at 
                    ? new Date(ticket.last_message_at).toLocaleString() 
                    : isRtl ? 'لا توجد رسائل' : 'No messages'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {ticket.unread_user_messages > 0 && (
                    <div className="flex items-center">
                      <span className="flex h-5 w-5 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 justify-center items-center text-white text-xs">
                          {ticket.unread_user_messages}
                        </span>
                      </span>
                      <span className="ml-2 rtl:mr-2 rtl:ml-0 text-xs font-medium text-red-500 font-cairo">
                        {isRtl ? 'رسائل جديدة' : 'New Messages'}
                      </span>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full font-cairo ${
                    ticket.status === 'open'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                  }`}>
                    {ticket.status === 'open'
                      ? isRtl ? 'مفتوح' : 'Open'
                      : isRtl ? 'مغلق' : 'Closed'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                  <div className="flex justify-center space-x-2 rtl:space-x-reverse">
                    {ticket.status === 'open' ? (
                      <button
                        onClick={(e) => handleCloseTicket(e, ticket.id)}
                        className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-cairo px-3 py-1"
                      >
                        {isRtl ? 'إغلاق' : 'Close'}
                      </button>
                    ) : (
                      <button
                        onClick={(e) => handleReopenTicket(e, ticket.id)}
                        className="text-green-500 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 font-cairo px-3 py-1"
                      >
                        {isRtl ? 'إعادة فتح' : 'Reopen'}
                      </button>
                    )}
                    <button
                      onClick={(e) => handleDeleteTicket(e, ticket.id)}
                      disabled={deleting === ticket.id}
                      className={`text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-300 ${deleting === ticket.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <FiTrash2 className="h-5 w-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Mobile view - Cards */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {tickets.map((ticket) => (
          <div 
            key={ticket.id}
            className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => onSelectTicket(ticket)}
          >
            <div className="flex justify-between items-start mb-2">
              <div className="font-medium text-gray-900 dark:text-white font-cairo">
                {ticket.subject}
              </div>
              <span className={`px-2 py-1 text-xs rounded-full font-cairo ${
                ticket.status === 'open'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
              }`}>
                {ticket.status === 'open'
                  ? isRtl ? 'مفتوح' : 'Open'
                  : isRtl ? 'مغلق' : 'Closed'}
              </span>
            </div>
            
            {ticket.unread_user_messages > 0 && (
              <div className="flex items-center mb-2">
                <span className="flex h-5 w-5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 justify-center items-center text-white text-xs">
                    {ticket.unread_user_messages}
                  </span>
                </span>
                <span className="ml-2 rtl:mr-2 rtl:ml-0 text-xs font-medium text-red-500 font-cairo">
                  {isRtl ? 'رسائل جديدة من العميل' : 'New messages from client'}
                </span>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-2 text-sm mb-3">
              <div>
                <div className="text-gray-500 dark:text-gray-400 font-cairo">
                  {isRtl ? 'رقم التذكرة' : 'Ticket ID'}
                </div>
                <div className="font-medium text-gray-900 dark:text-white">#{ticket.id}</div>
              </div>
              
              <div>
                <div className="text-gray-500 dark:text-gray-400 font-cairo">
                  {isRtl ? 'المستخدم' : 'User'}
                </div>
                <div className="font-medium text-gray-900 dark:text-white truncate">
                  {ticket.user_email || ticket.user_name}
                </div>
              </div>
              
              <div>
                <div className="text-gray-500 dark:text-gray-400 font-cairo">
                  {isRtl ? 'تاريخ الإنشاء' : 'Created'}
                </div>
                <div className="text-gray-700 dark:text-gray-300">
                  {new Date(ticket.created_at).toLocaleDateString()}
                </div>
              </div>
              
              <div>
                <div className="text-gray-500 dark:text-gray-400 font-cairo">
                  {isRtl ? 'آخر رسالة' : 'Last Message'}
                </div>
                <div className="text-gray-700 dark:text-gray-300">
                  {ticket.last_message_at 
                    ? new Date(ticket.last_message_at).toLocaleString() 
                    : isRtl ? 'لا توجد رسائل' : 'No messages'}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end border-t pt-2 dark:border-gray-700">
              <div className="flex space-x-2 rtl:space-x-reverse">
                {ticket.status === 'open' ? (
                  <button
                    onClick={(e) => handleCloseTicket(e, ticket.id)}
                    className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-cairo text-sm px-3 py-1"
                  >
                    {isRtl ? 'إغلاق' : 'Close'}
                  </button>
                ) : (
                  <button
                    onClick={(e) => handleReopenTicket(e, ticket.id)}
                    className="text-green-500 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 font-cairo text-sm px-3 py-1"
                  >
                    {isRtl ? 'إعادة فتح' : 'Reopen'}
                  </button>
                )}
                <button
                  onClick={(e) => handleDeleteTicket(e, ticket.id)}
                  disabled={deleting === ticket.id}
                  className={`text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-300 flex items-center ${deleting === ticket.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <FiTrash2 className="h-4 w-4 mr-1 rtl:ml-1 rtl:mr-0" />
                  <span className="font-cairo text-sm">{isRtl ? 'حذف' : 'Delete'}</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
