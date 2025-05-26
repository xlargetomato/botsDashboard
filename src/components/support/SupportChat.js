'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n/config';
import Image from 'next/image';
import { createPortal } from 'react-dom';

export default function SupportChat({ ticketId, onClose, isRtl }) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ticketStatus, setTicketStatus] = useState('open'); // Default to open
  const [modalImage, setModalImage] = useState(null);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const chatContainerRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = useCallback(async () => {
    try {
      const response = await fetch(`/api/support/messages?ticketId=${ticketId}`);
      if (response.ok) {
        const data = await response.json();
        // Only update if we have new messages or if it's the first load
        if (loading || data.messages.length !== messages.length) {
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
        }
      } else {
        const responseError = await response.json();
        setError(responseError.error || (isRtl ? 'فشل إرسال الرسالة' : 'Failed to send message'));
      }
    } catch (error) {
      setError(isRtl ? 'حدث خطأ أثناء إرسال الرسالة' : 'An error occurred while sending the message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[90vh] md:h-[600px] bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden w-full md:max-w-4xl mx-auto border border-gray-200 dark:border-gray-700">
      {/* Chat header */}
      <div className="flex justify-between items-center p-3 sm:p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full ${ticketStatus === 'open' ? 'bg-green-500' : 'bg-gray-400'} ${isRtl ? 'ml-2' : 'mr-2'}`}></div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 font-cairo">
            {ticketStatus === 'open' ? (isRtl ? 'مفتوح' : 'Open') : (isRtl ? 'مغلق' : 'Closed')}
          </span>
        </div>
        
        {ticketStatus === 'open' && (
          <button
            onClick={async () => {
              if (window.confirm(isRtl ? 'هل أنت متأكد أنك تريد إغلاق هذه التذكرة؟' : 'Are you sure you want to close this ticket?')) {
                try {
                  const response = await fetch(`/api/support/tickets/${ticketId}/close`, { method: 'POST' });
                  if (response.ok) {
                    setTicketStatus('closed');
                  } else {
                    const error = await response.json();
                    setError(error.error || 'Failed to close ticket');
                  }
                } catch (error) {
                  setError('Failed to close ticket');
                }
              }
            }}
            className="text-sm text-red-500 hover:text-red-600 font-medium px-3 py-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 font-cairo transition-colors"
          >
            {isRtl ? 'إغلاق التذكرة' : 'Close Ticket'}
          </button>
        )}
      </div>
      
      {/* Error message */}
      {error && (
        <div className="mx-3 my-2 p-3 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 rounded-lg text-sm font-cairo">
          {error}
        </div>
      )}
      
      {/* Chat messages */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-white dark:bg-gray-800"
          style={{ scrollBehavior: 'smooth' }}
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6">
              <div className="bg-gray-100 dark:bg-gray-700 rounded-full p-4 mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-gray-600 dark:text-gray-400 font-cairo text-sm sm:text-base">
                {isRtl ? 'لا توجد رسائل بعد. ابدأ المحادثة!' : 'No messages yet. Start the conversation!'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => {
                const isUserMessage = message.sender_type === 'user';
                const showAvatar = index === 0 || messages[index - 1].sender_type !== message.sender_type;
                const messageTime = new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                
                return (
                  <div key={message.id} className="mb-4">
                    {/* Message header with name */}
                    {showAvatar && (
                      <div className={`text-xs ${isUserMessage ? 'text-right' : 'text-left'} mb-1 ${isRtl ? 'rtl' : 'ltr'}`}>
                        <span className="font-medium text-gray-600 dark:text-gray-300 font-cairo">
                          {isUserMessage ? (isRtl ? 'أنت' : 'You') : (isRtl ? 'الدعم الفني' : 'Support')}
                        </span>
                      </div>
                    )}
                    
                    {/* Message container */}
                    <div className={`flex ${isUserMessage ? 'justify-end' : 'justify-start'}`}>
                      <div 
                        className={`max-w-[80%] ${isUserMessage 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white'} p-3 rounded-lg shadow-sm`}
                      >
                        {/* Message content */}
                        {message.content && (
                          <p className="text-sm font-cairo whitespace-pre-wrap">{message.content}</p>
                        )}
                        
                        {/* File attachment */}
                        {message.file_url && (
                          <div className="mt-2">
                            {message.file_type.startsWith('image/') ? (
                              <div 
                                className="cursor-pointer hover:opacity-90 transition-opacity rounded-lg overflow-hidden"
                                onClick={() => setModalImage(message.file_url)}
                              >
                                <Image 
                                  src={message.file_url} 
                                  alt="Attached image" 
                                  width={200} 
                                  height={150} 
                                  className="rounded-lg object-cover" 
                                  style={{ maxWidth: '100%', height: 'auto' }}
                                />
                              </div>
                            ) : (
                              <a 
                                href={message.file_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center p-2 bg-gray-100 dark:bg-gray-600 rounded-md text-xs sm:text-sm hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isRtl ? 'ml-2' : 'mr-2'} text-gray-500 dark:text-gray-300`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span className="font-cairo truncate">{message.file_name}</span>
                              </a>
                            )}
                          </div>
                        )}
                        
                        {/* Timestamp */}
                        <div className={`text-xs mt-1 text-right ${isUserMessage ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                          {messageTime}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      )}
      
      {/* Message input */}
      {!loading && ticketStatus === 'open' && (
        <div className="p-2 sm:p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 z-10 shadow-md">
          <form onSubmit={handleSubmit} className="">
            {/* File preview */}
            {file && (
              <div className="flex items-center p-2 mb-2 bg-gray-100 dark:bg-gray-700 rounded-md">
                <span className="text-xs sm:text-sm truncate flex-1 font-cairo text-gray-700 dark:text-gray-300">
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
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
            
            {/* Input area */}
            <div className="flex items-center space-x-2 rtl:space-x-reverse bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
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
                className="flex-1 p-2 text-sm sm:text-base bg-transparent text-gray-900 dark:text-white font-cairo focus:outline-none"
              />
              <button
                type="submit"
                disabled={(!newMessage.trim() && !file) || sending}
                className="p-2 text-white rounded-md bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[40px]"
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
          </form>
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
}
