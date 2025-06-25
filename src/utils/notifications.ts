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
        category_id: 'chat_message',
        badge:1,
        data: {type: 'invite'},
        content_available: true,
        priority: 'high'
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
