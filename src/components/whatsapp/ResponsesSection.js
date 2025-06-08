'use client';

import { useState, useEffect } from 'react';
import { AiOutlinePlus, AiOutlineLoading3Quarters, AiOutlineDelete } from 'react-icons/ai';

export default function ResponsesSection({ botId, isRtl }) {
  const [responses, setResponses] = useState([]);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [savingResponse, setSavingResponse] = useState(false);
  
  // New response form state
  const [newResponse, setNewResponse] = useState({
    trigger_text: '',
    response_text: '',
    response_type: 'text',
    media_url: '',
    conditions: null,
    chat_type: 'all'
  });
  
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
      }
    } catch (error) {
      console.error('Error fetching responses:', error);
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
      } else {
        console.error('Failed to add response');
      }
    } catch (error) {
      console.error('Error adding response:', error);
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
      } else {
        console.error('Failed to delete response');
      }
    } catch (error) {
      console.error('Error deleting response:', error);
    }
  };
  
  // Fetch responses on component mount
  useEffect(() => {
    if (botId) {
      fetchResponses();
    }
  }, [botId]);
  
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        {isRtl ? 'تكوين الردود' : 'Response Configuration'}
      </h2>
      
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        {isRtl 
          ? 'إنشاء ردود تلقائية للرسائل الواردة بناءً على الكلمات الرئيسية.'
          : 'Create automatic responses to incoming messages based on keywords.'}
      </p>
      
      {/* Add new response form */}
      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mb-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          {isRtl ? 'إضافة رد جديد' : 'Add New Response'}
        </h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="trigger_text" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isRtl ? 'الكلمة المفتاحية' : 'Trigger Text'}
              </label>
              <input
                id="trigger_text"
                type="text"
                value={newResponse.trigger_text}
                onChange={(e) => setNewResponse({...newResponse, trigger_text: e.target.value})}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder={isRtl ? 'أدخل الكلمة المفتاحية هنا...' : 'Enter trigger text here...'}
              />
            </div>
            
            <div>
              <label htmlFor="response_type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isRtl ? 'نوع الرد' : 'Response Type'}
              </label>
              <select
                id="response_type"
                value={newResponse.response_type}
                onChange={(e) => setNewResponse({...newResponse, response_type: e.target.value})}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="text">{isRtl ? 'نص' : 'Text'}</option>
                <option value="image">{isRtl ? 'صورة' : 'Image'}</option>
                <option value="buttons">{isRtl ? 'أزرار' : 'Buttons'}</option>
                <option value="list">{isRtl ? 'قائمة' : 'List'}</option>
              </select>
            </div>
          </div>
          
          <div className="mb-4">
            <label htmlFor="chat_type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {isRtl ? 'نوع المحادثة' : 'Chat Type'}
            </label>
            <select
              id="chat_type"
              value={newResponse.chat_type}
              onChange={(e) => setNewResponse({...newResponse, chat_type: e.target.value})}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">{isRtl ? 'الكل' : 'All Chats'}</option>
              <option value="private">{isRtl ? 'محادثة خاصة' : 'Private Chats Only'}</option>
              <option value="group">{isRtl ? 'محادثة جماعية' : 'Group Chats Only'}</option>
            </select>
          </div>
          
          <div className="mb-4">
            <label htmlFor="response_text" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {isRtl ? 'نص الرد' : 'Response Text'}
            </label>
            <textarea
              id="response_text"
              value={newResponse.response_text}
              onChange={(e) => setNewResponse({...newResponse, response_text: e.target.value})}
              rows="3"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder={isRtl ? 'أدخل نص الرد هنا...' : 'Enter response text here...'}
            />
          </div>
          
          <div>
            <button
              onClick={handleAddResponse}
              disabled={savingResponse || !newResponse.trigger_text || !newResponse.response_text}
              className={`px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-sm ${
                (!newResponse.trigger_text || !newResponse.response_text) ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {savingResponse ? (
                <div className="flex items-center">
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  {isRtl ? 'جاري الحفظ...' : 'Saving...'}
                </div>
              ) : (
                <div className="flex items-center">
                  <AiOutlinePlus className="mr-2" />
                  {isRtl ? 'إضافة رد' : 'Add Response'}
                </div>
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Existing responses list */}
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        {isRtl ? 'الردود الحالية' : 'Existing Responses'}
      </h3>
      
      {loadingResponses ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : responses.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {isRtl ? 'الكلمة المفتاحية' : 'Trigger'}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {isRtl ? 'نوع الرد' : 'Type'}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {isRtl ? 'نوع المحادثة' : 'Chat Type'}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {isRtl ? 'نص الرد' : 'Response Text'}
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {isRtl ? 'الإجراءات' : 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
              {responses.map((response) => (
                <tr key={response.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {response.trigger_text}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {response.response_type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {response.chat_type === 'all' 
                      ? (isRtl ? 'الكل' : 'All Chats')
                      : response.chat_type === 'private' 
                        ? (isRtl ? 'محادثة خاصة' : 'Private Only')
                        : (isRtl ? 'محادثة جماعية' : 'Group Only')
                    }
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    <div className="max-w-xs truncate">
                      {response.response_text}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleDeleteResponse(response.id)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 flex items-center justify-end"
                    >
                      <AiOutlineDelete className="mr-1" />
                      {isRtl ? 'حذف' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-500 dark:text-gray-400 py-4">
          {isRtl ? 'لا توجد ردود بعد.' : 'No responses yet.'}
        </p>
      )}
    </div>
  );
} 