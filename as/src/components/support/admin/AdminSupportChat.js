'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n/config';
import Image from 'next/image';
import { createPortal } from 'react-dom';

export default function AdminSupportChat({ ticketId, isRtl }) {
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
      
      await fetch('/api/admin/support/messages/seen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketId,
          messageIds: unseenIds,
        }),
      });
      
      // Update local state to mark messages as seen
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          unseenIds.includes(msg.id) ? { ...msg, is_seen: true } : msg
        )
      );
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
    }
  }, [messages, markMessagesAsSeen]);

  const fetchMessages = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/support/messages?ticketId=${ticketId}`);
      if (response.ok) {
        const data = await response.json();
        // Only update if we have new messages or if it's the first load
        if (loading || data.messages.length !== messages.length) {
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
  }, [ticketId, loading, messages.length]);

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
      <div className="flex items-center justify-center h-96">
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
      setError(isRtl ? 'فشل إغلاق التذكرة' : 'Failed to close ticket');
    }
  };



  return (
    <div className="flex flex-col h-[85vh] md:h-[600px] w-full max-w-full md:max-w-4xl mx-auto overflow-hidden">
      {/* User info and ticket actions */}
      

      {/* Messages */}
      <div className="flex-1 overflow-y-auto border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 mb-3 sm:mb-4 relative">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 dark:text-gray-400 font-cairo text-center p-4">
              {isRtl ? 'لا توجد رسائل بعد. ابدأ المحادثة!' : 'No messages yet. Start the conversation!'}
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-3 sm:space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.is_admin ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] sm:max-w-[70%] rounded-lg p-2 sm:p-3 ${
                    message.is_admin
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                  }`}
                >
                  <div className="flex items-center mb-1">
                    <span className="font-semibold font-cairo text-sm">
                      {message.is_admin 
                        ? (isRtl ? 'أنت' : 'You') 
                        : message.sender_name || (isRtl ? 'المستخدم' : 'User')}
                    </span>
                    <span className="ml-2 rtl:mr-2 rtl:ml-0 text-xs opacity-75">
                      {new Date(message.created_at).toLocaleTimeString()}
                    </span>
                    {!message.is_admin && message.is_seen && (
                      <span className="ml-2 rtl:mr-2 rtl:ml-0 text-xs text-blue-500 dark:text-blue-400">
                        {isRtl ? 'تم القراءة' : 'Seen'}
                      </span>
                    )}
                  </div>
                  {/* File attachment - image */}
                  {message.file_name && message.file_type && message.file_type.startsWith('image/') && (
                    <div className="mt-2 mb-2">
                      {message.file_url ? (
                        <div 
                          className="relative w-full h-40 sm:h-64 mb-2 cursor-pointer hover:opacity-90 transition-opacity rounded-lg overflow-hidden"
                          onClick={() => setModalImage(message.file_url)}
                        >
                          <Image 
                            src={message.file_url} 
                            alt="Attached image" 
                            fill
                            style={{ objectFit: 'contain' }}
                            className="rounded-lg" 
                          />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                            <div className="bg-black bg-opacity-50 p-2 rounded-full">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-2 bg-gray-200 dark:bg-gray-600 rounded text-sm text-center">
                          {isRtl ? 'صورة مرفقة' : 'Image attachment'}: {message.file_name}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* File attachment - other file types */}
                  {message.file_name && (!message.file_type || !message.file_type.startsWith('image/')) && (
                    <div className="mb-2">
                      <a 
                        href={message.file_url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className={`flex items-center space-x-1 rtl:space-x-reverse ${
                          message.is_admin 
                            ? 'text-blue-200 hover:text-blue-100' 
                            : 'text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300'
                        }`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        <span>{message.file_name}</span>
                      </a>
                    </div>
                  )}
                  
                  {/* Message content */}
                  <p className="font-cairo whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Success message */}
      {success && (
        <div className="p-2 text-center text-green-500 dark:text-green-400 font-cairo text-sm">
          {success}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="p-2 text-center text-red-500 dark:text-red-400 font-cairo text-sm">
          {error}
        </div>
      )}

      {/* Input area - disabled when ticket is closed */}
      {ticketStatus === 'closed' ? (
        <div className="p-3 sm:p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-center rounded-lg mt-3 sm:mt-4 sticky bottom-0">
          <div className="flex items-center justify-center mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="font-cairo text-gray-700 dark:text-gray-300 font-medium">
              {isRtl ? 'تم إغلاق هذه التذكرة' : 'This ticket is closed'}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-cairo">
            {isRtl ? 'لا يمكن إرسال رسائل جديدة إلى تذكرة مغلقة' : 'New messages cannot be sent to a closed ticket'}
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="p-2 sm:p-4 border-t dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg mt-3 sm:mt-4 sticky bottom-0">
        {file && (
          <div className="mb-2 p-2 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-300 truncate font-cairo">
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
            className="p-1 sm:p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
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
            placeholder={isRtl ? 'اكتب رسالتك هنا...' : 'Type your message here...'}
            className="flex-1 p-1.5 sm:p-2 text-sm sm:text-base rounded-lg border dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-cairo focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-16 sm:h-20"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() && !file}
            className="p-1.5 sm:p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </form>
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
}
