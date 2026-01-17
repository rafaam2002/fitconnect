import fetch from 'node-fetch';

export async function sendPushNotification(
  token: string,
  title: string,
  body: string,
  data?: Record<string, any>
) {
  const message = {
    to: token,
    sound: 'default',
    title,
    body,
    data,
    content_available: true,
    priority: 'high',
    badge: 1,
  };

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });

  return response.json();
}
