'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

export default function WorkingHoursSection({ botId, initialWorkingHours = [], isRtl }) {
  const [workingHours, setWorkingHours] = useState([]);
  const [savingWorkingHours, setSavingWorkingHours] = useState(false);
  
  // Initialize working hours on component mount
  useEffect(() => {
    // Create default structure for all days of the week
    const defaultHours = [0, 1, 2, 3, 4, 5, 6].map(dayIndex => {
      const existingDay = initialWorkingHours.find(h => h.day_of_week === dayIndex);
      return {
        day_of_week: dayIndex,
        from_time: existingDay ? existingDay.from_time : '09:00',
        to_time: existingDay ? existingDay.to_time : '17:00',
        is_active: existingDay ? true : false // Default to inactive if not found in initial data
      };
    });
    
    setWorkingHours(defaultHours);
  }, [initialWorkingHours]);

  // Handler for updating working hours
  const handleUpdateWorkingHours = async () => {
    setSavingWorkingHours(true);
    try {
      // Only send active days to the API
      const activeHours = workingHours.filter(day => day.is_active).map(day => ({
        day_of_week: day.day_of_week,
        from_time: day.from_time,
        to_time: day.to_time
      }));
      
      const response = await fetch(`/api/bots/${botId}/working-hours`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activeHours)
      });
      
      if (response.ok) {
        toast.success(isRtl ? 'تم حفظ ساعات العمل بنجاح' : 'Working hours saved successfully');
      } else {
        console.error('Failed to update working hours');
        toast.error(isRtl ? 'فشل في حفظ ساعات العمل' : 'Failed to save working hours');
      }
    } catch (error) {
      console.error('Error updating working hours:', error);
      toast.error(isRtl ? 'خطأ في حفظ ساعات العمل' : 'Error saving working hours');
    } finally {
      setSavingWorkingHours(false);
    }
  };

  // Helper function to update working hour fields
  const updateWorkingHour = (dayIndex, field, value) => {
    setWorkingHours(prevHours => 
      prevHours.map(day => 
        day.day_of_week === dayIndex 
          ? { ...day, [field]: value } 
          : day
      )
    );
  };

  // Toggle day active status
  const toggleDayActive = (dayIndex) => {
    setWorkingHours(prevHours => 
      prevHours.map(day => 
        day.day_of_week === dayIndex 
          ? { ...day, is_active: !day.is_active } 
          : day
      )
    );
  };

  // Helper function to get day name
  const getDayName = (dayIndex) => {
    const days = [
      isRtl ? 'الأحد' : 'Sunday',
      isRtl ? 'الإثنين' : 'Monday',
      isRtl ? 'الثلاثاء' : 'Tuesday',
      isRtl ? 'الأربعاء' : 'Wednesday',
      isRtl ? 'الخميس' : 'Thursday',
      isRtl ? 'الجمعة' : 'Friday',
      isRtl ? 'السبت' : 'Saturday'
    ];
    return days[dayIndex];
  };
  
  // Format time to AM/PM format
  const formatTime = (time) => {
    if (!time) return '';
    
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours, 10);
    
    if (isNaN(h)) return time;
    
    const period = h >= 12 ? 'PM' : 'AM';
    const displayHour = h > 12 ? h - 12 : (h === 0 ? 12 : h);
    
    return `${displayHour.toString().padStart(2, '0')}:${minutes}`;
  };

  // Get period (AM/PM) from time
  const getPeriod = (time) => {
    if (!time) return 'AM';
    const hours = parseInt(time.split(':')[0], 10);
    return hours >= 12 ? 'PM' : 'AM';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 md:p-6 mb-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
        {isRtl ? 'ساعات العمل' : 'Working Hours'}
      </h2>
      
      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg mb-6 border border-blue-100 dark:border-blue-800">
        <p className="text-blue-700 dark:text-blue-300 text-sm">
          {isRtl 
            ? 'حدد الأوقات التي يكون فيها البوت نشطًا للرد على الرسائل. سيتجاهل الرسائل خارج ساعات العمل.' 
            : 'Set the times when the bot will be active and respond to messages. Messages outside these hours will be ignored.'}
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {workingHours.map((day) => (
          <div 
            key={day.day_of_week} 
            className={`p-4 rounded-lg ${day.is_active 
              ? 'bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600 shadow-sm' 
              : 'bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700'
            } transition-all duration-200`}
          >
            <div className="flex justify-between items-center mb-4">
              <span className="font-medium text-gray-800 dark:text-white">
                {getDayName(day.day_of_week)}
              </span>
              
              {/* Switch styled to match the image */}
              <label className="inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox"
                  checked={day.is_active}
                  onChange={() => toggleDayActive(day.day_of_week)}
                  className="sr-only peer"
                />
                <div className="relative w-11 h-6 bg-gray-200 dark:bg-gray-700 rounded-full peer peer-checked:bg-blue-400 peer-focus:ring-2 peer-focus:ring-blue-300">
                  <div className={`absolute left-0.5 top-0.5 bg-white w-5 h-5 rounded-full transition-all duration-300 shadow-md transform ${day.is_active ? 'translate-x-5' : ''}`}></div>
                </div>
              </label>
            </div>
            
            <div className={`space-y-3 ${day.is_active ? '' : 'opacity-50'}`}>
              <div>
                <div className="mb-1 text-xs text-gray-500 dark:text-gray-400 rtl:text-right">
                  {isRtl ? 'من الساعة' : 'From'}
                </div>
                <div className="relative">
                  <div className={`absolute flex items-center ${isRtl ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 pointer-events-none`}>
                    <span className="text-gray-400 text-sm font-medium mr-1">
                      {getPeriod(day.from_time)}
                    </span>
                  </div>
                  
                  <input
                    type="time"
                    value={day.from_time}
                    onChange={(e) => updateWorkingHour(day.day_of_week, 'from_time', e.target.value)}
                    disabled={!day.is_active}
                    className={`w-full border border-gray-200 dark:border-gray-600 rounded-lg px-16 py-3 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isRtl ? 'text-right pr-16 pl-12' : 'text-left pl-16 pr-12'}`}
                  />
                  
                  <div className={`absolute flex items-center ${isRtl ? 'left-3' : 'right-3'} top-1/2 transform -translate-y-1/2 pointer-events-none`}>
                    <div className="w-6 h-6 flex items-center justify-center rounded-full">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <div className="mb-1 text-xs text-gray-500 dark:text-gray-400 rtl:text-right">
                  {isRtl ? 'إلى الساعة' : 'To'}
                </div>
                <div className="relative">
                  <div className={`absolute flex items-center ${isRtl ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 pointer-events-none`}>
                    <span className="text-gray-400 text-sm font-medium mr-1">
                      {getPeriod(day.to_time)}
                    </span>
                  </div>
                  
                  <input
                    type="time"
                    value={day.to_time}
                    onChange={(e) => updateWorkingHour(day.day_of_week, 'to_time', e.target.value)}
                    disabled={!day.is_active}
                    className={`w-full border border-gray-200 dark:border-gray-600 rounded-lg px-16 py-3 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isRtl ? 'text-right pr-16 pl-12' : 'text-left pl-16 pr-12'}`}
                  />
                  
                  <div className={`absolute flex items-center ${isRtl ? 'left-3' : 'right-3'} top-1/2 transform -translate-y-1/2 pointer-events-none`}>
                    <div className="w-6 h-6 flex items-center justify-center rounded-full">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-6 flex justify-between items-center">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {workingHours.filter(d => d.is_active).length} {isRtl ? 'أيام نشطة' : 'active days'}
        </div>
        
        <button
          onClick={handleUpdateWorkingHours}
          disabled={savingWorkingHours}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-sm transition-colors duration-200 flex items-center"
        >
          {savingWorkingHours ? (
            <>
              <div className={`animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full ${isRtl ? 'ml-2' : 'mr-2'}`}></div>
              <span>{isRtl ? 'جاري الحفظ...' : 'Saving...'}</span>
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isRtl ? 'ml-2' : 'mr-2'}`} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>{isRtl ? 'حفظ ساعات العمل' : 'Save Working Hours'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
} 