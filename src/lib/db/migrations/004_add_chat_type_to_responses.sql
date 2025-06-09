-- Add chat_type column to bot_responses table
ALTER TABLE bot_responses 
ADD COLUMN chat_type ENUM('all', 'private', 'group') NOT NULL DEFAULT 'all'
COMMENT 'Determines whether the response applies to all chats, private chats only, or group chats only';
 
-- Update existing responses to 'all' to maintain backward compatibility
UPDATE bot_responses SET chat_type = 'all'; 