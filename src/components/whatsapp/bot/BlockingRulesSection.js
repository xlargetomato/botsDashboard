'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';

export default function BlockingRulesSection({ botId, initialBlockRules = [], isRtl, hasFeature }) {
  const [blockRules, setBlockRules] = useState(initialBlockRules);
  const [newBlockRule, setNewBlockRule] = useState({ pattern: '', block_message: '' });
  const [savingBlockRule, setSavingBlockRule] = useState(false);

  // Handler for adding a new block rule
  const handleAddBlockRule = async () => {
    if (!newBlockRule.pattern || !newBlockRule.block_message) return;
    
    setSavingBlockRule(true);
    try {
      const response = await fetch(`/api/bots/${botId}/block-rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBlockRule)
      });
      
      if (response.ok) {
        const result = await response.json();
        // Add the new rule to the local state
        setBlockRules([...blockRules, { 
          id: result.id, 
          ...newBlockRule,
          is_active: true 
        }]);
        // Reset the form
        setNewBlockRule({ pattern: '', block_message: '' });
        toast.success(isRtl ? 'تمت إضافة القاعدة بنجاح' : 'Rule added successfully');
      } else {
        console.error('Failed to add block rule');
        toast.error(isRtl ? 'فشل في إضافة القاعدة' : 'Failed to add rule');
      }
    } catch (error) {
      console.error('Error adding block rule:', error);
      toast.error(isRtl ? 'خطأ في إضافة القاعدة' : 'Error adding rule');
    } finally {
      setSavingBlockRule(false);
    }
  };

  // Handler for deleting a block rule
  const handleDeleteBlockRule = async (ruleId) => {
    try {
      const response = await fetch(`/api/bots/${botId}/block-rules/${ruleId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        // Remove the rule from local state
        setBlockRules(blockRules.filter(rule => rule.id !== ruleId));
        toast.success(isRtl ? 'تم حذف القاعدة بنجاح' : 'Rule deleted successfully');
      } else {
        console.error('Failed to delete block rule');
        toast.error(isRtl ? 'فشل في حذف القاعدة' : 'Failed to delete rule');
      }
    } catch (error) {
      console.error('Error deleting block rule:', error);
      toast.error(isRtl ? 'خطأ في حذف القاعدة' : 'Error deleting rule');
    }
  };

  // If feature is not available, show message
  if (!hasFeature('block_rules')) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {isRtl ? 'حظر جهات الاتصال' : 'Block Contacts'}
        </h2>
        <div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-800 rounded-md p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className={`${isRtl ? 'mr-3' : 'ml-3'}`}>
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                {isRtl ? 'ميزة غير متوفرة' : 'Feature Not Available'}
              </h3>
              <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-200">
                <p>
                  {isRtl 
                    ? 'ميزة حظر جهات الاتصال غير متوفرة في باقتك الحالية. قم بالترقية للحصول على هذه الميزة.' 
                    : 'Contact blocking is not available in your current tier. Upgrade to get this feature.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        {isRtl ? 'حظر جهات الاتصال' : 'Block Contacts'}
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        {isRtl 
          ? 'أضف قواعد لحظر الرسائل التي تحتوي على أنماط معينة.' 
          : 'Add rules to block messages containing certain patterns.'}
      </p>
      
      {/* Add new block rule form */}
      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mb-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          {isRtl ? 'إضافة قاعدة جديدة' : 'Add New Rule'}
        </h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="pattern" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {isRtl ? 'النمط' : 'Pattern'}
            </label>
            <input
              type="text"
              id="pattern"
              value={newBlockRule.pattern}
              onChange={(e) => setNewBlockRule({...newBlockRule, pattern: e.target.value})}
              placeholder={isRtl ? 'مثال: spam' : 'e.g., spam'}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label htmlFor="block_message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {isRtl ? 'رسالة الحظر' : 'Block Message'}
            </label>
            <textarea
              id="block_message"
              value={newBlockRule.block_message}
              onChange={(e) => setNewBlockRule({...newBlockRule, block_message: e.target.value})}
              placeholder={isRtl ? 'الرسالة التي سيتم إرسالها للمستخدم المحظور' : 'Message to send to blocked user'}
              rows="3"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <button
              onClick={handleAddBlockRule}
              disabled={savingBlockRule || !newBlockRule.pattern || !newBlockRule.block_message}
              className={`px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-sm ${
                (!newBlockRule.pattern || !newBlockRule.block_message) ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {savingBlockRule ? (
                <div className="flex items-center">
                  <div className={`animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full ${isRtl ? 'ml-2' : 'mr-2'}`}></div>
                  {isRtl ? 'جاري الحفظ...' : 'Saving...'}
                </div>
              ) : (
                isRtl ? 'إضافة قاعدة' : 'Add Rule'
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Existing block rules list */}
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        {isRtl ? 'القواعد الحالية' : 'Existing Rules'}
      </h3>
      
      {blockRules.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {isRtl ? 'النمط' : 'Pattern'}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {isRtl ? 'رسالة الحظر' : 'Block Message'}
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {isRtl ? 'الإجراءات' : 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {blockRules.map((rule) => (
                <tr key={rule.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {rule.pattern}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {rule.block_message}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleDeleteBlockRule(rule.id)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                    >
                      {isRtl ? 'حذف' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-500 dark:text-gray-400">
          {isRtl ? 'لا توجد قواعد حظر بعد.' : 'No block rules yet.'}
        </p>
      )}
    </div>
  );
} 