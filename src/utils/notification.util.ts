import fetch from 'node-fetch';

import { PushNotificationData } from '../types/common.type';

/**
 * Fábrica del mensaje de Expo Push API. La categoría y los adjuntos son
 * siempre opcionales: si no vienen en `data`, el mensaje resultante es
 * idéntico al formato histórico (sin categoryId/richContent/mutableContent),
 * preservando el comportamiento de las notificaciones genéricas existentes.
 */
export function buildExpoPushMessage(
  token: string,
  title: string,
  body: string,
  data?: PushNotificationData
) {
  const { categoryIdentifier, richContent, ...restData } = data ?? {};

  const message: Record<string, any> = {
    to: token,
    sound: 'default',
    title,
    body,
    data: data ? restData : undefined,
    content_available: true,
    priority: 'high',
    badge: 1,
  };

  if (categoryIdentifier) {
    message.categoryId = categoryIdentifier;
  }

  if (richContent?.image) {
    message.richContent = { image: richContent.image };
    message.mutableContent = true;
  }

  return message;
}

export async function sendPushNotification(
  token: string,
  title: string,
  body: string,
  data?: PushNotificationData
) {
  const message = buildExpoPushMessage(token, title, body, data);

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
