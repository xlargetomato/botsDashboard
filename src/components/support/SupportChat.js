'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n/config';
import Image from 'next/image';
import { createPortal } from 'react-dom';

const SupportChat = ({ ticketId, onClose, isRtl }) => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ticketStatus, setTicketStatus] = useState('open'); // Default to open
  const [modalImage, setModalImage] = useState(null);
  const [sending, setSending] = useState(false);
  const [unreadAdminMessages, setUnreadAdminMessages] = useState([]);
  const [closingTicket, setClosingTicket] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  
  // Track if the component is visible in the viewport
  const [isVisible, setIsVisible] = useState(true);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const chatContainerRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Function to mark messages as seen on the server
  const markMessagesAsSeen = useCallback(async (messageIds) => {
    try {
      await fetch('/api/support/messages/seen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketId,
          messageIds
        }),
      });
      // We don't need to do anything with the response as we're already updating the UI
    } catch (error) {
      console.error('Error marking messages as seen:', error);
    }
  }, [ticketId]);
  
  // Only scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Separate effect for marking messages as read to avoid unnecessary API calls
  useEffect(() => {
    // Only mark messages as read when they become visible and there are unread messages
    if (isVisible && unreadAdminMessages.length > 0) {
      // Call API to update the seen status in the database
      markMessagesAsSeen(unreadAdminMessages);
      // Update local state
      setUnreadAdminMessages([]);
    }
  }, [isVisible, unreadAdminMessages, markMessagesAsSeen]);

  const fetchMessages = useCallback(async () => {
    try {
      const response = await fetch(`/api/support/messages?ticketId=${ticketId}`);
      if (response.ok) {
        const data = await response.json();
        // Only update if we have new messages or if it's the first load
        if (loading || data.messages.length !== messages.length) {
          // Check for new admin messages that aren't in our current message list
          const currentIds = new Set(messages.map(m => m.id));
          const newAdminMessages = data.messages.filter(msg => 
            msg.sender_type === 'admin' && !currentIds.has(msg.id) && !msg.seen
          );
          
          // If there are new admin messages and we're not loading for the first time, track them as unread
          if (newAdminMessages.length > 0 && !loading) {
            setUnreadAdminMessages(prev => [...prev, ...newAdminMessages.map(m => m.id)]);
          }
          
          setMessages(data.messages);
          
          // Update ticket status if available
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
    // Initial fetch regardless of visibility
    fetchMessages();
    
    // Set up polling with a 10-second interval
    pollingIntervalRef.current = setInterval(() => {
      if (isVisible) {
        fetchMessages();
      }
    }, 10000);
    
    // Use IntersectionObserver to detect when chat is visible
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 } // 10% visibility is enough to consider it "visible"
    );
    
    // Start observing the chat container
    if (chatContainerRef.current) {
      observer.observe(chatContainerRef.current);
    }
    
    // Handle document visibility changes
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Clean up on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      
      // Disconnect the observer
      observer.disconnect();
      
      // Remove visibility change listener
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [ticketId, fetchMessages]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    
    if (selectedFile) {
      // Only accept files under 5MB
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError(isRtl ? 'حجم الملف كبير جدًا. الحد الأقصى هو 5 ميجابايت.' : 'File size too large. Maximum is 5MB.');
        return;
      }
      
      setFile(selectedFile);
    }
  };

  // Handle closing a ticket
  const closeTicket = async () => {
    if (ticketStatus === 'closed') return;
    
    setClosingTicket(true);
    
    try {
      const response = await fetch('/api/support/tickets/close', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ticketId }),
      });

      if (response.ok) {
        setTicketStatus('closed');
        setShowCloseConfirm(false);
        // Fetch messages to get the system message about closure
        fetchMessages();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to close ticket');
      }
    } catch (error) {
      setError('Failed to close ticket');
      console.error('Error closing ticket:', error);
    } finally {
      setClosingTicket(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && !file) return;

    // Prevent duplicate submissions by checking if already sending
    if (sending) return;

    try {
      setSending(true);
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
          setSending(false);
          return;
        }
        
        fileData = await uploadResponse.json();
      }
      
      // Now send the message with file information if available
      const response = await fetch('/api/support/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketId,
          content: newMessage.trim(),
          ...(fileData ? { 
            fileUrl: fileData.url,
            fileName: fileData.name,
            fileType: fileData.type,
            fileSize: fileData.size
          } : {})
        }),
      });

      if (response.ok) {
        setNewMessage('');
        setFile(null);
        // Immediately fetch to show the new message
        fetchMessages();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to send message');
      }
    } catch (error) {
      setError('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div 
        className="w-full max-w-2xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden flex flex-col"
        dir={isRtl ? 'rtl' : 'ltr'}
        ref={chatContainerRef}
      >
        {/* Error message if any */}
        {error && (
          <div className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 p-2 text-center text-sm">
            {error}
            <button 
              onClick={() => setError('')} 
              className="ml-2 text-red-600 dark:text-red-300 hover:text-red-800 dark:hover:text-red-100"
              aria-label={isRtl ? 'إغلاق' : 'Close'}
            >
              ×
            </button>
          </div>
        )}
        
        {/* Loading state */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="w-10 h-10 border-4 border-gray-300 dark:border-gray-600 border-t-blue-500 dark:border-t-blue-400 rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Header with ticket management buttons */}
            <div className="flex justify-between items-center p-2 sm:p-3 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white font-cairo">
                {isRtl ? 'دعم فني' : 'Support'}
                {ticketStatus === 'closed' && (
                  <span className="ms-2 px-2 py-0.5 text-xs rounded-full bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100">
                    {isRtl ? 'مغلقة' : 'Closed'}
                  </span>
                )}
              </h2>
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                {ticketStatus === 'open' && (
                  <button 
                    onClick={() => setShowCloseConfirm(true)}
                    className="p-1 sm:p-1.5 rounded-md text-xs bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-colors dark:bg-red-900/30 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/50"
                    disabled={closingTicket}
                    aria-label={isRtl ? 'إغلاق التذكرة' : 'Close Ticket'}
                  >
                    {closingTicket ? (
                      <div className="h-4 w-4 rounded-full border-2 border-t-transparent border-red-600 dark:border-red-400 animate-spin"></div>
                    ) : isRtl ? 'إغلاق التذكرة' : 'Close Ticket'}
                  </button>
                )}
                <button 
                  onClick={onClose}
                  className="p-1 sm:p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  aria-label={isRtl ? 'إغلاق' : 'Close'}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Messages container */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 text-center p-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p>{isRtl ? 'لا توجد رسائل بعد. ابدأ المحادثة!' : 'No messages yet. Start the conversation!'}</p>
                </div>
              ) : (
                messages.map((message, index) => {
                  const isAdmin = message.sender_type === 'admin';
                  const showDate = index === 0 || new Date(message.created_at).toDateString() !== new Date(messages[index - 1].created_at).toDateString();
                  const isUnread = unreadAdminMessages.includes(message.id);
                  
                  return (
                    <div key={message.id}>
                      {/* Date separator */}
                      {showDate && (
                        <div className="flex justify-center my-2">
                          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full text-xs">
                            {new Date(message.created_at).toLocaleDateString(isRtl ? 'ar-SA' : undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                      )}
                      
                      {/* Message */}
                      <div className={`flex ${isAdmin ? 'justify-start' : 'justify-end'} relative`}>
                        {/* Unread indicator */}
                        {isUnread && (
                          <div className="absolute top-0 left-0 transform -translate-x-3 -translate-y-1 w-3 h-3 bg-blue-500 rounded-full"></div>
                        )}
                        
                        <div className={`max-w-[80%] ${isAdmin ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white' : 'bg-blue-500 text-white'} rounded-lg px-3 py-2 break-words`}>
                          <div className="flex flex-col">
                            {/* Message content */}
                            <div className="whitespace-pre-wrap">{message.content}</div>
                            
                            {/* File attachment */}
                            {message.file_url && (
                              <div className="mt-2">
                                {/\.(jpg|jpeg|png|gif|webp)$/i.test(message.file_name) ? (
                                  <div className="relative w-full max-w-xs h-36 cursor-pointer" onClick={() => setModalImage(message.file_url)}>
                                    <Image 
                                      src={message.file_url} 
                                      alt={message.file_name || 'Attached image'}
                                      fill
                                      style={{ objectFit: 'contain' }}
                                      className="rounded-md"
                                      sizes="(max-width: 768px) 100vw, 300px"
                                    />
                                  </div>
                                ) : (
                                  <a 
                                    href={message.file_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <span className="text-sm text-gray-800 dark:text-gray-200 truncate">
                                      {message.file_name || 'Attachment'}
                                    </span>
                                  </a>
                                )}
                              </div>
                            )}
                            
                            {/* Message timestamp */}
                            <div className={`text-right text-xs mt-1 ${isAdmin ? 'text-gray-500 dark:text-gray-400' : 'text-blue-200 dark:text-blue-300'}`}>
                              {new Date(message.created_at).toLocaleTimeString(isRtl ? 'ar-SA' : undefined, { 
                                hour: '2-digit', 
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              {/* This empty div is used to scroll to the bottom */}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Input form */}
            <form onSubmit={handleSubmit} className="p-2 border-t border-gray-200 dark:border-gray-700">
              {/* File preview */}
              {file && (
                <div className="mb-2 bg-gray-50 dark:bg-gray-700 rounded-lg p-2 flex justify-between items-center">
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-300 truncate">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    <span className="truncate max-w-[200px]">{file.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
              
              {/* Input area */}
              <div className="flex items-center space-x-1 sm:space-x-2 rtl:space-x-reverse bg-gray-100 dark:bg-gray-700 rounded-lg px-2 sm:px-3 py-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1.5 sm:p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
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
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={isRtl ? 'اكتب رسالتك هنا...' : 'Type your message here...'}
                  className="flex-1 p-1.5 sm:p-2 text-xs sm:text-sm bg-transparent text-gray-900 dark:text-white font-cairo focus:outline-none"
                  disabled={ticketStatus === 'closed'}
                />
                <button
                  type="submit"
                  disabled={(!newMessage.trim() && !file) || sending || ticketStatus === 'closed'}
                  className="p-1.5 sm:p-2 text-white rounded-md bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[36px] sm:min-w-[40px]"
                  aria-label={sending ? (isRtl ? 'جاري الإرسال...' : 'Sending...') : (isRtl ? 'إرسال' : 'Send')}
                >
                  {sending ? (
                    <div className="h-5 w-5 rounded-full border-2 border-t-transparent border-white animate-spin"></div>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </div>
              
              {/* Show ticket is closed message */}
              {ticketStatus === 'closed' && (
                <div className="mt-2 text-xs text-center text-gray-500 dark:text-gray-400">
                  {isRtl ? 'تم إغلاق هذه التذكرة. لا يمكن إرسال رسائل جديدة.' : 'This ticket has been closed. You cannot send new messages.'}
                </div>
              )}
            </form>
          </div>
        )}
        
        {/* Close Ticket Confirmation Dialog */}
        {showCloseConfirm && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 max-w-sm w-full shadow-lg">
              <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">
                {isRtl ? 'تأكيد إغلاق التذكرة' : 'Confirm Ticket Closure'}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {isRtl 
                  ? 'هل أنت متأكد أنك تريد إغلاق هذه التذكرة؟ لن تتمكن من إرسال رسائل جديدة بعد الإغلاق.'
                  : 'Are you sure you want to close this ticket? You will not be able to send new messages after closing.'
                }
              </p>
              <div className="flex justify-end space-x-2 rtl:space-x-reverse">
                <button
                  onClick={() => setShowCloseConfirm(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  onClick={closeTicket}
                  disabled={closingTicket}
                  className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {closingTicket ? (
                    <div className="h-5 w-5 rounded-full border-2 border-t-transparent border-white animate-spin"></div>
                  ) : isRtl ? 'إغلاق التذكرة' : 'Close Ticket'}
                </button>
              </div>
            </div>
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
    </div>
  );
};

export default SupportChat;
