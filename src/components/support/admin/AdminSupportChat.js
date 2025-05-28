'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n/config';
import Image from 'next/image';
import { createPortal } from 'react-dom';

const AdminSupportChat = ({ ticketId, isRtl }) => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userInfo, setUserInfo] = useState(null);
  const [ticketStatus, setTicketStatus] = useState('open'); // Default to open
  const [modalImage, setModalImage] = useState(null);
  const [unreadUserMessages, setUnreadUserMessages] = useState([]);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  
  // Function to mark messages as seen
  const markMessagesAsSeen = useCallback(async () => {
    try {
      // Get all unseen messages from the user (non-admin)
      const unseenMessages = messages.filter(msg => !msg.is_admin && !msg.is_seen);
      
      if (unseenMessages.length === 0) return;
      
      const unseenIds = unseenMessages.map(msg => msg.id);
      
      const response = await fetch('/api/admin/support/messages/seen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketId,
          messageIds: unseenIds,
        }),
      });
      
      if (response.ok) {
        // Update local state to mark messages as seen
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            unseenIds.includes(msg.id) ? { ...msg, is_seen: true } : msg
          )
        );
        
        // Clear any unread message notifications
        setUnreadUserMessages(prev => prev.filter(id => !unseenIds.includes(id)));
      }
    } catch (error) {
      console.error('Error marking messages as seen:', error);
    }
  }, [messages, ticketId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Mark messages as seen when they come into view
  useEffect(() => {
    if (messages.length > 0) {
      markMessagesAsSeen();
      
      // When we've seen the messages, clear our unread tracking
      setUnreadUserMessages([]);
    }
  }, [messages, markMessagesAsSeen]);

  const fetchMessages = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/support/messages?ticketId=${ticketId}`);
      if (response.ok) {
        const data = await response.json();
        
        // Only update if we have new messages, different content, or if it's the first load
        const hasNewMessages = data.messages.length !== messages.length;
        const hasChangedMessages = data.messages.some((newMsg, i) => {
          const oldMsg = messages[i];
          return !oldMsg || newMsg.id !== oldMsg.id || newMsg.is_seen !== oldMsg.is_seen;
        });
        
        if (loading || hasNewMessages || hasChangedMessages) {
          // Check for new user messages that aren't in our current message list
          const currentIds = new Set(messages.map(m => m.id));
          const newUserMessages = data.messages.filter(msg => 
            !msg.is_admin && !currentIds.has(msg.id) && !msg.is_seen
          );
          
          // If there are new user messages and we're not loading for the first time, track them as unread
          if (newUserMessages.length > 0 && !loading) {
            setUnreadUserMessages(prev => [...prev, ...newUserMessages.map(m => m.id)]);
            // Show notification in the browser if supported
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('New support message', {
                body: `You have ${newUserMessages.length} new message(s) from a client`,
                icon: '/logo.png'
              });
            }
          }
          
          setMessages(data.messages);
          if (data.userInfo) {
            setUserInfo(data.userInfo);
          }
          if (data.ticket && data.ticket.status) {
            setTicketStatus(data.ticket.status);
          }
        }
      } else {
        const error = await response.json();
        setError(error.error || 'Failed to load messages');
      }
    } catch (error) {
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [ticketId, loading, messages]);

  // Initial fetch and setup polling for real-time updates
  useEffect(() => {
    fetchMessages();

    // Set up polling for new messages every 5 seconds
    pollingIntervalRef.current = setInterval(fetchMessages, 5000);

    // Clean up interval on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [ticketId, fetchMessages]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.size > 5 * 1024 * 1024) { // 5MB limit
        setError(isRtl ? 'الحد الأقصى لحجم الملف هو 5 ميجابايت' : 'Maximum file size is 5MB');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && !file) return;

    try {
      setError('');
      let fileData = null;
      
      // If there's a file, upload it first
      if (file) {
        const uploadFormData = new FormData();
        uploadFormData.append('file', file);
        
        const uploadResponse = await fetch('/api/support/upload', {
          method: 'POST',
          body: uploadFormData,
        });
        
        if (!uploadResponse.ok) {
          const uploadError = await uploadResponse.json();
          setError(uploadError.error || (isRtl ? 'فشل رفع الملف' : 'Failed to upload file'));
          return;
        }
        
        fileData = await uploadResponse.json();
      }
      
      // Now send the message with file information if available
      const response = await fetch('/api/admin/support/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketId: ticketId,
          content: newMessage.trim(),
          ...(fileData && {
            fileName: fileData.fileName,
            fileType: fileData.fileType,
            fileUrl: fileData.fileUrl
          })
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.message) {
          setMessages(prev => [...prev, data.message]);
          setNewMessage('');
          setFile(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        } else {
          // Fallback for backward compatibility
          fetchMessages();
          setNewMessage('');
          setFile(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      } else {
        const error = await response.json();
        setError(error.error || (isRtl ? 'فشل إرسال الرسالة' : 'Failed to send message'));
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError(isRtl ? 'فشل إرسال الرسالة' : 'Failed to send message');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-60">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Function to close the ticket
  const closeTicket = async () => {
    try {
      setError('');
      setSuccess('');
      
      const response = await fetch(`/api/admin/support/tickets/${ticketId}/close`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        setTicketStatus('closed');
        setSuccess(isRtl ? 'تم إغلاق التذكرة بنجاح' : 'Ticket closed successfully');
      } else {
        const errorData = await response.json();
        setError(errorData.error || (isRtl ? 'فشل إغلاق التذكرة' : 'Failed to close ticket'));
      }
    } catch (error) {
      console.error('Error closing ticket:', error);
      setError('Failed to close ticket');
    }
  };

  return (
    <div className="flex flex-col h-[80vh] sm:h-[85vh] md:h-[600px] w-full max-w-full md:max-w-4xl mx-auto overflow-hidden bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 shadow-md">
      {/* User info and ticket status */}
      {userInfo && (
        <div className="p-2 sm:p-3 md:p-4 border-b dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <span className="text-lg font-semibold">{userInfo.name?.charAt(0) || userInfo.email?.charAt(0) || '?'}</span>
              </div>
              <div className="ml-2 rtl:ml-0 rtl:mr-2">
                <h3 className="font-semibold font-cairo">{userInfo.name || userInfo.email}</h3>
                {userInfo.email && userInfo.name && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-cairo">{userInfo.email}</p>
                )}
              </div>
            </div>
            
            {/* New message notification indicator */}
            {unreadUserMessages.length > 0 && (
              <div className="flex items-center ml-3 rtl:mr-3 rtl:ml-0">
                <span className="flex h-5 w-5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 justify-center items-center text-white text-xs">
                    {unreadUserMessages.length}
                  </span>
                </span>
                <span className="ml-1 rtl:mr-1 rtl:ml-0 text-xs font-medium text-red-500 font-cairo">
                  {isRtl ? 'رسائل جديدة' : 'New Messages'}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ticketStatus === 'open' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
              {ticketStatus === 'open' ? 'Open' : 'Closed'}
            </span>
            {ticketStatus === 'open' && (
              <button 
                onClick={closeTicket} 
                className="ml-2 rtl:ml-0 rtl:mr-2 text-red-500 hover:text-red-700 text-sm bg-white dark:bg-gray-800 px-2 py-1 rounded border border-red-300 dark:border-red-700 transition-colors"
              >
                Close Ticket
              </button>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-4 relative">
        {ticketStatus === 'closed' && (
          <div className="sticky top-0 z-10 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 p-2 rounded-lg mb-2 text-sm font-cairo text-center">
            This ticket is closed. New messages cannot be added.
          </div>
        )}
        
        <div className="space-y-3 sm:space-y-4">
          {loading ? (
            <div className="flex justify-center p-4">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center p-4 text-gray-500 dark:text-gray-400 font-cairo">
              No messages yet
            </div>
          ) : (
            messages.map((message) => (
              <div 
                key={message.id} 
                className={`flex ${message.is_admin ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[85%] sm:max-w-[75%] rounded-lg p-2 sm:p-3 ${message.is_admin 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center mb-1 gap-1">
                    <span className="font-semibold text-xs">
                      {message.is_admin ? (isRtl ? 'أنت (الدعم)' : 'You (Support)') : (userInfo?.name || userInfo?.email || 'User')}
                    </span>
                    <span className="sm:ml-2 sm:rtl:mr-2 sm:rtl:ml-0 text-xs opacity-75">
                      {new Date(message.created_at).toLocaleString()}
                    </span>
                    {!message.is_admin && message.is_seen && (
                      <span className="sm:ml-2 sm:rtl:mr-2 sm:rtl:ml-0 text-xs text-blue-300 dark:text-blue-400">
                        {isRtl ? 'تم الاطلاع' : 'Seen'}
                      </span>
                    )}
                    {!message.is_admin && unreadUserMessages.includes(message.id) && (
                      <span className="sm:ml-2 sm:rtl:mr-2 sm:rtl:ml-0 text-xs text-red-500 flex items-center">
                        <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-1 rtl:ml-1 rtl:mr-0"></span>
                        {isRtl ? 'جديد' : 'New'}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm mb-1 whitespace-pre-wrap break-words font-cairo">{message.content}</p>
                  
                  {message.fileUrl && (
                    <div className="mt-2">
                      {/\.(jpg|jpeg|png|gif|webp)$/i.test(message.fileName) ? (
                        <div 
                          className="cursor-pointer" 
                          onClick={() => setModalImage(message.fileUrl)}
                        >
                          <div className="relative w-full h-32 sm:h-40 bg-gray-200 dark:bg-gray-600 rounded overflow-hidden">
                            <Image 
                              src={message.fileUrl} 
                              alt={message.fileName} 
                              fill
                              style={{ objectFit: 'contain' }}
                              className="hover:opacity-90 transition-opacity"
                              sizes="(max-width: 768px) 100vw, 300px"
                            />
                          </div>
                          <p className="text-xs mt-1 opacity-75 truncate">{message.fileName}</p>
                        </div>
                      ) : (
                        <a 
                          href={message.fileUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="flex items-center p-2 bg-gray-50 dark:bg-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-500 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="ml-2 rtl:ml-0 rtl:mr-2 text-sm truncate">{message.fileName}</span>
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Chat input */}
      {ticketStatus === 'open' ? (
        <form onSubmit={handleSubmit} className="p-2 sm:p-3 border-t dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800">
          {error && (
            <div className="mb-2 p-2 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-sm rounded">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-2 p-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-sm rounded">
              {success}
            </div>
          )}
          {file && (
            <div className="mb-2 p-2 bg-blue-50 dark:bg-blue-900/30 rounded flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-300 truncate max-w-[80%] font-cairo">
                {file.name}
              </span>
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          <div className="flex items-center space-x-1 sm:space-x-2 rtl:space-x-reverse">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.txt"
            />
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message here..."
              className="flex-1 p-1.5 sm:p-2 text-sm rounded-lg border dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-cairo focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-12 sm:h-14 md:h-16"
            />
            <button
              type="submit"
              disabled={!newMessage.trim() && !file}
              className="p-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </form>
      ) : (
        <div className="p-3 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-300 font-cairo">
            This ticket is closed
          </p>
        </div>
      )}
      
      {/* Image Modal */}
      {modalImage && typeof window !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-2 sm:p-4"
          onClick={() => setModalImage(null)}
        >
          <div className="relative max-w-full sm:max-w-4xl max-h-[90vh] w-full h-full">
            <Image
              src={modalImage}
              alt="Full size image"
              fill
              style={{ objectFit: 'contain' }}
              className="rounded-lg"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 75vw, 50vw"
              priority
            />
            <button 
              className="absolute top-2 right-2 bg-black bg-opacity-50 rounded-full p-2 text-white hover:bg-opacity-70 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                setModalImage(null);
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AdminSupportChat;
