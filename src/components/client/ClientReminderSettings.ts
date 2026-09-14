// Reminder Engine settings adapter for ClientMarketingAgent / business settings
export const reminderSettingsConfig = {
  enabled: true,
  firstReminderHoursBefore: 24,
  secondReminderEnabled: false,
  secondReminderHoursBefore: 2,
  channels: ['whatsapp', 'telegram', 'messenger', 'instagram'] as const,
  timezone: 'Africa/Cairo',
};
