-- SQL migration to add 'weekly' to subscription_type ENUM
ALTER TABLE subscriptions 
MODIFY COLUMN subscription_type ENUM('weekly', 'monthly', 'yearly') NOT NULL;
