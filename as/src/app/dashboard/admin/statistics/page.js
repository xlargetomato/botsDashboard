'use client';

import { useState, useEffect } from 'react';
import { FiUsers, FiUserCheck, FiUserX, FiTrendingUp } from 'react-icons/fi';
import AdminLayout from '@/components/layouts/AdminLayout';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function StatisticsPage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    expiredAccounts: 0,
    userGrowth: [],
    subscriptionTrends: [],
    planDistribution: []
  });
  
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('month'); // 'week', 'month', 'year'

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/admin/statistics?timeRange=${timeRange}`);
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        } else {
          console.error('Failed to fetch statistics');
        }
      } catch (error) {
        console.error('Error fetching statistics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, [timeRange]);

  // Sample data for demonstration (will be replaced with actual data from API)
  const sampleUserGrowthData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'New Users',
        data: [12, 19, 15, 25, 22, 30],
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        tension: 0.3,
      },
    ],
  };

  const sampleSubscriptionTrendsData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Active Subscriptions',
        data: [10, 15, 20, 25, 30, 35],
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
      },
      {
        label: 'Expired Subscriptions',
        data: [5, 7, 4, 6, 8, 10],
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
      },
    ],
  };

  const samplePlanDistributionData = {
    labels: ['Basic', 'Premium', 'Enterprise'],
    datasets: [
      {
        label: 'Subscription Plans',
        data: [30, 50, 20],
        backgroundColor: [
          'rgba(255, 99, 132, 0.5)',
          'rgba(54, 162, 235, 0.5)',
          'rgba(255, 206, 86, 0.5)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  // Chart options
  const lineOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'User Growth Over Time',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const barOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Subscription Trends',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const pieOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Subscription Plan Distribution',
      },
    },
  };

  // Statistics cards data
  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers || 0,
      icon: FiUsers,
      color: 'bg-blue-500',
    },
    {
      title: 'Active Users',
      value: stats.activeUsers || 0,
      icon: FiUserCheck,
      color: 'bg-green-500',
    },
    {
      title: 'Expired Accounts',
      value: stats.expiredAccounts || 0,
      icon: FiUserX,
      color: 'bg-red-500',
    },
    {
      title: 'User Growth Rate',
      value: '12%',
      icon: FiTrendingUp,
      color: 'bg-purple-500',
    },
  ];

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">
            Statistics
          </h1>
          <div className="flex space-x-2">
            <button
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                timeRange === 'week'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600'
              }`}
              onClick={() => setTimeRange('week')}
            >
              Week
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                timeRange === 'month'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600'
              }`}
              onClick={() => setTimeRange('month')}
            >
              Month
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                timeRange === 'year'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600'
              }`}
              onClick={() => setTimeRange('year')}
            >
              Year
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((card, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
              <div className="p-6">
                <div className="flex items-center">
                  <div className={`p-3 rounded-full ${card.color} text-white mr-4`}>
                    <card.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      {card.title}
                    </p>
                    <p className="text-2xl font-semibold text-gray-800 dark:text-white">
                      {card.value}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 animate-pulse">
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Growth Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                User Growth
              </h2>
              <div className="h-64">
                <Line data={sampleUserGrowthData} options={lineOptions} />
              </div>
            </div>

            {/* Subscription Trends Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                Subscription Trends
              </h2>
              <div className="h-64">
                <Bar data={sampleSubscriptionTrendsData} options={barOptions} />
              </div>
            </div>

            {/* Subscription Plan Distribution Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                Subscription Plan Distribution
              </h2>
              <div className="h-64 flex items-center justify-center">
                <div className="w-full max-w-xs">
                  <Pie data={samplePlanDistributionData} options={pieOptions} />
                </div>
              </div>
            </div>

            {/* Additional Stats */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                Key Metrics
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Average Subscription Duration</span>
                  <span className="font-medium text-gray-800 dark:text-white">4.2 months</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Renewal Rate</span>
                  <span className="font-medium text-gray-800 dark:text-white">68%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Monthly Revenue</span>
                  <span className="font-medium text-gray-800 dark:text-white">$4,250</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">User Retention</span>
                  <span className="font-medium text-gray-800 dark:text-white">72%</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
