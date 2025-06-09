'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

export default function CallBlockingSection({ botId, isRtl }) {
  const [callSettings, setCallSettings] = useState({
    block_all_calls: false,
    call_limit_per_day: 3,
    enable_call_limit: false,
    call_block_message: "Sorry, your call has been blocked according to system settings."
  });
  
  const [savingSettings, setSavingSettings] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch existing call blocking settings
  useEffect(() => {
    const fetchCallSettings = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/bots/${botId}/call-settings`);
        
        if (response.ok) {
          const data = await response.json();
          if (data && Object.keys(data).length > 0) {
            setCallSettings(data);
          }
        }
      } catch (error) {
        console.error("Error fetching call settings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCallSettings();
  }, [botId]);

  // Handler for updating call blocking settings
  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const response = await fetch(`/api/bots/${botId}/call-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(callSettings)
      });
      
      if (response.ok) {
        toast.success("Call blocking settings saved successfully");
      } else {
        console.error("Failed to update call settings");
        toast.error("Failed to save call blocking settings");
      }
    } catch (error) {
      console.error("Error updating call settings:", error);
      toast.error("Error saving call blocking settings");
    } finally {
      setSavingSettings(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 font-cairo">
        {isRtl ? "إعدادات حظر المكالمات" : "Call Blocking Settings"}
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6 font-cairo">
        {isRtl 
          ? "تكوين كيفية تعامل البوت مع المكالمات الواردة" 
          : "Configure how the bot handles incoming calls from contacts."}
      </p>
      
      <div className="space-y-8">
        {/* Block All Calls Option */}
        <div className="bg-gray-50 dark:bg-gray-700 p-5 rounded-lg">
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="block-all-calls"
                type="checkbox"
                checked={callSettings.block_all_calls}
                onChange={(e) => setCallSettings({...callSettings, block_all_calls: e.target.checked})}
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 dark:border-gray-600 rounded"
              />
            </div>
            <div className={`${isRtl ? "mr-3" : "ml-3"} text-sm`}>
              <label htmlFor="block-all-calls" className="font-medium text-gray-700 dark:text-gray-300 block mb-1 font-cairo">
                {isRtl ? "حظر جميع المكالمات" : "Block All Incoming Calls"}
              </label>
              <p className="text-gray-500 dark:text-gray-400 font-cairo">
                {isRtl 
                  ? "تمكين هذا الخيار سيحظر جميع المكالمات" 
                  : "Enabling this option will block all incoming calls to the bot."}
              </p>
            </div>
          </div>
          
          {callSettings.block_all_calls && (
            <div className="mt-4">
              <label htmlFor="block-message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 font-cairo">
                {isRtl ? "رسالة الحظر" : "Block Message"}
              </label>
              <textarea
                id="block-message"
                value={callSettings.call_block_message}
                onChange={(e) => setCallSettings({...callSettings, call_block_message: e.target.value})}
                placeholder={isRtl ? "رسالة عند حظر المكالمات" : "Message to send when blocking calls"}
                rows="2"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-cairo"
              />
            </div>
          )}
        </div>
        
        {/* Call Limit Per Day */}
        {!callSettings.block_all_calls && (
          <div className="bg-gray-50 dark:bg-gray-700 p-5 rounded-lg">
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="enable-call-limit"
                  type="checkbox"
                  checked={callSettings.enable_call_limit}
                  onChange={(e) => setCallSettings({...callSettings, enable_call_limit: e.target.checked})}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 dark:border-gray-600 rounded"
                />
              </div>
              <div className={`${isRtl ? "mr-3" : "ml-3"} text-sm`}>
                <label htmlFor="enable-call-limit" className="font-medium text-gray-700 dark:text-gray-300 block mb-1 font-cairo">
                  {isRtl ? "تفعيل حد المكالمات اليومي" : "Enable Daily Call Limit"}
                </label>
                <p className="text-gray-500 dark:text-gray-400 font-cairo">
                  {isRtl 
                    ? "حظر المستخدمين الذين يتجاوزون عدد معين من المكالمات" 
                    : "Block users who exceed a certain number of calls per day."}
                </p>
              </div>
            </div>
            
            {callSettings.enable_call_limit && (
              <div className="mt-4 space-y-4">
                <div>
                  <label htmlFor="call-limit" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 font-cairo">
                    {isRtl ? "الحد الأقصى للمكالمات" : "Maximum Calls Per Day"}
                  </label>
                  <div className="flex items-center">
                    <input
                      id="call-limit"
                      type="number"
                      min="1"
                      max="100"
                      value={callSettings.call_limit_per_day}
                      onChange={(e) => setCallSettings({...callSettings, call_limit_per_day: parseInt(e.target.value) || 3})}
                      className="w-24 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-cairo"
                    />
                    <span className={`${isRtl ? "mr-2" : "ml-2"} text-gray-500 dark:text-gray-400 font-cairo`}>
                      {isRtl ? "مكالمات" : "calls"}
                    </span>
                  </div>
                </div>
                
                <div>
                  <label htmlFor="call-block-message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 font-cairo">
                    {isRtl ? "رسالة الحظر" : "Block Message"}
                  </label>
                  <textarea
                    id="call-block-message"
                    value={callSettings.call_block_message}
                    onChange={(e) => setCallSettings({...callSettings, call_block_message: e.target.value})}
                    placeholder={isRtl ? "رسالة عند تجاوز حد المكالمات" : "Message to send when call limit is exceeded"}
                    rows="2"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-cairo"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Save Button */}
        <div>
          <button
            onClick={handleSaveSettings}
            disabled={savingSettings}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-md shadow-sm font-cairo"
          >
            {savingSettings ? (
              <div className="flex items-center">
                <div className={`animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full ${isRtl ? "ml-2" : "mr-2"}`}></div>
                {isRtl ? "جاري الحفظ..." : "Saving..."}
              </div>
            ) : (
              isRtl ? "حفظ الإعدادات" : "Save Settings"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
