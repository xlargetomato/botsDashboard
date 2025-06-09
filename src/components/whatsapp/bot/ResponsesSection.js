'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

export default function ResponsesSection({ botId, isRtl }) {
  const [responses, setResponses] = useState([]);
  const [newResponse, setNewResponse] = useState({
    trigger_text: '',
    response_text: '',
    response_type: 'text',
    media_url: '',
    conditions: null,
    chat_type: 'all'
  });
  const [savingResponse, setSavingResponse] = useState(false);
  const [loadingResponses, setLoadingResponses] = useState(false);

  // Fetch responses for the bot
  const fetchResponses = async () => {
    try {
      setLoadingResponses(true);
      const response = await fetch(`/api/bots/${botId}/responses`);
      
      if (response.ok) {
        const data = await response.json();
        setResponses(data);
      } else {
        console.error('Failed to fetch responses');
        toast.error(isRtl ? 'فشل في جلب الردود' : 'Failed to fetch responses');
      }
    } catch (error) {
      console.error('Error fetching responses:', error);
      toast.error(isRtl ? 'خطأ في جلب الردود' : 'Error fetching responses');
    } finally {
      setLoadingResponses(false);
    }
  };

  // Handler for adding a new response
  const handleAddResponse = async () => {
    if (!newResponse.trigger_text || !newResponse.response_text) return;
    
    setSavingResponse(true);
    try {
      const response = await fetch(`/api/bots/${botId}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newResponse)
      });
      
      if (response.ok) {
        // Fetch the updated list of responses
        await fetchResponses();
        
        // Reset the form
        setNewResponse({
          trigger_text: '',
          response_text: '',
          response_type: 'text',
          media_url: '',
          conditions: null,
          chat_type: 'all'
        });
        toast.success(isRtl ? 'تمت إضافة الرد بنجاح' : 'Response added successfully');
      } else {
        console.error('Failed to add response');
        toast.error(isRtl ? 'فشل في إضافة الرد' : 'Failed to add response');
      }
    } catch (error) {
      console.error('Error adding response:', error);
      toast.error(isRtl ? 'خطأ في إضافة الرد' : 'Error adding response');
    } finally {
      setSavingResponse(false);
    }
  };

  // Handler for deleting a response
  const handleDeleteResponse = async (responseId) => {
    try {
      const response = await fetch(`/api/bots/${botId}/responses/${responseId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        // Fetch the updated list of responses
        await fetchResponses();
        toast.success(isRtl ? 'تم حذف الرد بنجاح' : 'Response deleted successfully');
      } else {
        console.error('Failed to delete response');
        toast.error(isRtl ? 'فشل في حذف الرد' : 'Failed to delete response');
      }
    } catch (error) {
      console.error('Error deleting response:', error);
      toast.error(isRtl ? 'خطأ في حذف الرد' : 'Error deleting response');
    }
  };

  // Fetch responses on component mount
  useEffect(() => {
    fetchResponses();
  }, [botId]);

  // Get chat type label
  const getChatTypeLabel = (chatType) => {
    switch(chatType) {
      case 'all': return isRtl ? 'الكل' : 'All Chats';
      case 'private': return isRtl ? 'محادثة خاصة' : 'Private Only';
      case 'group': return isRtl ? 'محادثة جماعية' : 'Group Only';
      default: return chatType;
    }
  };

  // Get response type icon
  const getResponseTypeIcon = (type) => {
    switch(type) {
      case 'text':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600 dark:text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" />
          </svg>
        );
      case 'image':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600 dark:text-indigo-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
          </svg>
        );
      case 'buttons':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600 dark:text-green-400" viewBox="0 0 20 20" fill="currentColor">
            <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" />
          </svg>
        );
      case 'list':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 dark:text-blue-400" viewBox="0 0 20 20" fill="currentColor">
            <path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8 font-cairo">
      <div className="flex flex-col md:flex-row md:items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 font-cairo">
            {isRtl ? 'تكوين الردود' : 'Response Configuration'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 font-cairo">
            {isRtl 
              ? 'إنشاء ردود تلقائية للرسائل الواردة بناءً على الكلمات الرئيسية.' 
              : 'Create automatic responses to incoming messages based on keywords.'}
          </p>
        </div>
        <div className="mt-4 md:mt-0 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
          <div className="flex items-center">
            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-800/30 text-blue-600 dark:text-blue-400 ${isRtl ? 'ml-3' : 'mr-3'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            <span className="text-sm text-blue-700 dark:text-blue-300 font-cairo">
              {isRtl ? 'لن يتم إرسال رد إذا لم يتم العثور على كلمة مفتاحية مطابقة.' : 'No response will be sent if no matching trigger is found.'}
            </span>
          </div>
        </div>
      </div>
      
      {/* Add new response form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transition-all duration-300">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-700 p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white font-cairo flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isRtl ? 'ml-2' : 'mr-2'} text-blue-500 dark:text-blue-400`} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
            </svg>
            {isRtl ? 'إضافة رد جديد' : 'Add New Response'}
          </h3>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="trigger_text" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 font-cairo">
                {isRtl ? 'الكلمة المفتاحية' : 'Trigger Text'}
              </label>
              <input
                id="trigger_text"
                type="text"
                value={newResponse.trigger_text}
                onChange={(e) => setNewResponse({...newResponse, trigger_text: e.target.value})}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-500 dark:focus:border-blue-500 transition-colors"
                placeholder={isRtl ? 'أدخل الكلمة المفتاحية هنا...' : 'Enter trigger text here...'}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 font-cairo">
                {isRtl ? 'مثال: مرحبًا، كيف حالك؟' : 'Example: hello, how are you?'}
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="response_type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 font-cairo">
                  {isRtl ? 'نوع الرد' : 'Response Type'}
                </label>
                <select
                  id="response_type"
                  value={newResponse.response_type}
                  onChange={(e) => setNewResponse({...newResponse, response_type: e.target.value})}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-500 dark:focus:border-blue-500 transition-colors"
                >
                  <option value="text">{isRtl ? 'نص' : 'Text'}</option>
                  <option value="image">{isRtl ? 'صورة' : 'Image'}</option>
                  <option value="buttons">{isRtl ? 'أزرار' : 'Buttons'}</option>
                  <option value="list">{isRtl ? 'قائمة' : 'List'}</option>
                </select>
              </div>

              <div>
                <label htmlFor="chat_type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 font-cairo">
                  {isRtl ? 'نوع المحادثة' : 'Chat Type'}
                </label>
                <select
                  id="chat_type"
                  value={newResponse.chat_type}
                  onChange={(e) => setNewResponse({...newResponse, chat_type: e.target.value})}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-500 dark:focus:border-blue-500 transition-colors"
                >
                  <option value="all">{isRtl ? 'الكل' : 'All Chats'}</option>
                  <option value="private">{isRtl ? 'محادثة خاصة' : 'Private Chats Only'}</option>
                  <option value="group">{isRtl ? 'محادثة جماعية' : 'Group Chats Only'}</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="response_text" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 font-cairo">
              {isRtl ? 'نص الرد' : 'Response Text'}
            </label>
            <textarea
              id="response_text"
              value={newResponse.response_text}
              onChange={(e) => setNewResponse({...newResponse, response_text: e.target.value})}
              rows="3"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-500 dark:focus:border-blue-500 transition-colors"
              placeholder={isRtl ? 'أدخل نص الرد هنا...' : 'Enter response text here...'}
            />
          </div>
          
          {newResponse.response_type === 'image' && (
            <div>
              <label htmlFor="media_url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 font-cairo">
                {isRtl ? 'رابط الصورة' : 'Image URL'}
              </label>
              <input
                type="text"
                id="media_url"
                value={newResponse.media_url}
                onChange={(e) => setNewResponse({...newResponse, media_url: e.target.value})}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-500 dark:focus:border-blue-500 transition-colors"
                placeholder={isRtl ? 'أدخل رابط الصورة هنا...' : 'Enter image URL here...'}
              />
            </div>
          )}
          
          <div className="flex justify-end">
            <button
              onClick={handleAddResponse}
              disabled={savingResponse || !newResponse.trigger_text || !newResponse.response_text}
              className={`px-4 py-2 rounded-md shadow-sm font-medium font-cairo transition-all duration-200 ${
                (!newResponse.trigger_text || !newResponse.response_text) 
                  ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white hover:shadow-md'
              }`}
            >
              {savingResponse ? (
                <div className="flex items-center">
                  <div className={`animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full ${isRtl ? 'ml-2' : 'mr-2'}`}></div>
                  {isRtl ? 'جاري الحفظ...' : 'Saving...'}
                </div>
              ) : (
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  {isRtl ? 'إضافة رد' : 'Add Response'}
                </div>
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Existing responses list */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-700 p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white font-cairo flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400" viewBox="0 0 20 20" fill="currentColor">
              <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
            </svg>
            {isRtl ? 'الردود الحالية' : 'Existing Responses'} 
            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400 font-normal">
              {responses.length > 0 ? `(${responses.length})` : ''}
            </span>
          </h3>
        </div>
        
        <div className="p-4">
          {loadingResponses ? (
            <div className="flex justify-center my-8">
              <div className="flex flex-col items-center">
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 font-cairo">
                  {isRtl ? 'جاري تحميل الردود...' : 'Loading responses...'}
                </p>
              </div>
            </div>
          ) : responses.length > 0 ? (
            <div className="overflow-x-auto">
              <div className="grid gap-4">
                {responses.map((response) => (
                  <div 
                    key={response.id} 
                    className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200"
                  >
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                      <div className="flex items-center mb-2 sm:mb-0">
                        <div className="bg-white dark:bg-gray-800 p-2 rounded-md mr-3 border border-gray-200 dark:border-gray-700">
                          {getResponseTypeIcon(response.response_type)}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white font-cairo">
                            {response.trigger_text}
                          </h4>
                          <div className="flex items-center mt-1">
                            <span className="text-xs bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-300 px-2 py-1 rounded-full font-cairo mr-2">
                              {response.response_type}
                            </span>
                            <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded-full font-cairo">
                              {getChatTypeLabel(response.chat_type)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteResponse(response.id)}
                        className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-cairo flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {isRtl ? 'حذف' : 'Delete'}
                      </button>
                    </div>
                    <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-cairo">
                        {response.response_text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-700/20 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <p className="text-gray-600 dark:text-gray-400 font-cairo text-lg">
                {isRtl ? 'لا توجد ردود بعد.' : 'No responses yet.'}
              </p>
              <p className="text-gray-500 dark:text-gray-500 font-cairo text-sm mt-1">
                {isRtl ? 'أضف ردودًا لجعل البوت الخاص بك أكثر تفاعلية.' : 'Add responses to make your bot more interactive.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 