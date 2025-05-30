'use client';

import { useState } from 'react';
import { useTranslation } from '@/lib/i18n/config';

export default function NewTicketForm({ onSubmit, onCancel, isRtl }) {
  const { t } = useTranslation();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      setError(isRtl ? 'يرجى ملء جميع الحقول' : 'Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: subject.trim(),
          message: message.trim(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        onSubmit(data.ticket);
      } else {
        const errorData = await response.json();
        setError(errorData.error || (isRtl ? 'فشل إنشاء التذكرة' : 'Failed to create ticket'));
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
      setError(isRtl ? 'فشل إنشاء التذكرة' : 'Failed to create ticket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
      <h2 className="text-xl font-semibold mb-4 font-cairo text-gray-900 dark:text-white">
        {isRtl ? 'تذكرة دعم جديدة' : 'New Support Ticket'}
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200 rounded font-cairo">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="subject"
            className="block mb-1 font-cairo text-gray-700 dark:text-gray-300"
          >
            {isRtl ? 'الموضوع' : 'Subject'}
          </label>
          <input
            type="text"
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full p-2 border rounded-lg dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-cairo focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={isRtl ? 'أدخل موضوع التذكرة' : 'Enter ticket subject'}
            disabled={loading}
          />
        </div>

        <div>
          <label
            htmlFor="message"
            className="block mb-1 font-cairo text-gray-700 dark:text-gray-300"
          >
            {isRtl ? 'الرسالة' : 'Message'}
          </label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full p-2 border rounded-lg dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-cairo focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[150px]"
            placeholder={isRtl ? 'اكتب رسالتك هنا...' : 'Type your message here...'}
            disabled={loading}
          />
        </div>

        <div className="flex justify-end space-x-3 rtl:space-x-reverse">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-cairo"
            disabled={loading}
          >
            {isRtl ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-cairo disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center space-x-2 rtl:space-x-reverse">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                <span>{isRtl ? 'جاري الإنشاء...' : 'Creating...'}</span>
              </span>
            ) : (
              <span>{isRtl ? 'إنشاء تذكرة' : 'Create Ticket'}</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
