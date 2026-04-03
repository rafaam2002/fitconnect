import dotenv from 'dotenv';
import moment from 'moment';

import { CurrentUser } from '../types/common.type';
import { CompanyProps } from '../types/resolvers';

dotenv.config();

export const templatesUtil = (emailVerificationTk: string) => {
  return `
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <title>Verifica tu cuenta</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #f4f4f7;
        margin: 0;
        padding: 0;
      }

      .container {
        max-width: 600px;
        margin: 40px auto;
        background-color: #ffffff;
        padding: 40px;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
      }

      h1 {
        color: #333333;
        text-align: center;
      }

      p {
        color: #555555;
        font-size: 16px;
        line-height: 1.5;
      }

      .button {
        display: inline-block;
        margin-top: 30px;
        padding: 12px 24px;
        background-color: #4caf50;
        color: #ffffff !important;
        text-decoration: none;
        border-radius: 5px;
        font-weight: bold;
      }

      .button:link,
      .button:visited,
      .button:active,
      .button:hover {
        color: #ffffff !important;
      }

      .footer {
        margin-top: 40px;
        font-size: 14px;
        color: #999999;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>¡Bienvenido a FitConnect!</h1>
      <p>
        Gracias por registrarte. Para completar tu registro, por favor verifica tu dirección de correo electrónico haciendo clic en el siguiente botón:
      </p>
      <p style="text-align: center;">
        <a href="${process.env.API_URL}/auth/verify-email?token=${emailVerificationTk}" class="button">Verificar mi correo</a>
      </p>
      <p>
        Este enlace es válido por 24 horas. Si no solicitaste esta verificación, puedes ignorar este mensaje.
      </p>
      <div class="footer">
        © 2025 fitconnect. Todos los derechos reservados.
      </div>
    </div>
  </body>
</html>
  `;
};

/**
 * Genera una página HTML con mensaje de éxito o error
 * @param title Título principal
 * @param message Texto descriptivo
 * @param success Si es true, muestra icono de éxito; si no, de error
 */
export function renderPage(title: string, message: string, success: boolean) {
  const color = success ? '#4CAF50' : '#F44336';
  const icon = success ? '✅' : '❌';
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title}</title>
  <style>
    body {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f5f5f5;
      color: #333;
      height: 100vh;
      margin: 0;
    }
    .card {
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      padding: 24px;
      max-width: 320px;
      text-align: center;
    }
    .icon {
      font-size: 48px;
      color: ${color};
      margin-bottom: 16px;
    }
    h1 {
      font-size: 24px;
      margin: 0 0 12px;
    }
    p {
      font-size: 16px;
      margin: 0 0 24px;
    }
    .button {
      display: inline-block;
      background: ${color};
      color: #fff;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 4px;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
</body>
</html>
`;
}

export const changePasswordHtml = (token: string, tmpPassword: string) =>
  `
  <!DOCTYPE html>
  <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <title>Verifica tu cuenta</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          background-color: #f4f4f7;
          margin: 0;
          padding: 0;
        }
  
        .container {
          max-width: 600px;
          margin: 40px auto;
          background-color: #ffffff;
          padding: 40px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }
  
        h1 {
          color: #333333;
          text-align: center;
        }
  
        p {
          color: #555555;
          font-size: 16px;
          line-height: 1.5;
        }
  
        .button {
          display: inline-block;
          margin-top: 30px;
          padding: 12px 24px;
          background-color: #4caf50;
          color: #ffffff !important;
          text-decoration: none;
          border-radius: 5px;
          font-weight: bold;
        }
  
        .button:link,
        .button:visited,
        .button:active,
        .button:hover {
          color: #ffffff !important;
        }
  
        .footer {
          margin-top: 40px;
          font-size: 14px;
          color: #999999;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Restablece tu contraseña</h1>
        <p>
          Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en FitConnect. Para cambiar tu contraseña, haz clic en el siguiente botón:
        </p>
        <p>
          Se generará una contraseña temporal (<strong>${tmpPassword}</strong>) que podrás usar para iniciar sesión y luego cambiarla dentro de los ajustes de la cuenta.
        </p>
        <p>
          Para cambiar tu contraseña, haz clic en el siguiente botón:
        </p>  
        <p style="text-align: center;">
          <a href="${process.env.API_URL}/auth/reset-password?token=${token}" class="button">Cambiar contraseña</a>
        </p>
        <p>
          Este enlace es válido por 30 minutos. Si no solicitaste este cambio de contraseña, puedes ignorar este mensaje de forma segura.
        </p>
        <div class="footer">
          © 2025 fitconnect. Todos los derechos reservados.
        </div>
      </div>
    </body>
  </html>
    `;

export const companyVerificationEmailHtml = (
  companyTk: string,
  company: CompanyProps,
  user: CurrentUser
) => {
  return `
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <title>Nueva compañía pendiente de verificación</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #f4f4f7;
        margin: 0;
        padding: 0;
      }

      .container {
        max-width: 600px;
        margin: 40px auto;
        background-color: #ffffff;
        padding: 40px;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
      }

      h1 {
        color: #333333;
        text-align: center;
      }

      p {
        color: #555555;
        font-size: 16px;
        line-height: 1.5;
      }

      .data-section {
        margin: 20px 0;
        padding: 15px;
        background-color: #f9f9f9;
        border-radius: 5px;
      }

      .data-section h2 {
        color: #333333;
        font-size: 18px;
        margin-top: 0;
      }

      .data-item {
        margin: 5px 0;
      }

      .button {
        display: inline-block;
        margin: 10px 10px 0 0;
        padding: 12px 24px;
        color: #ffffff !important;
        text-decoration: none;
        border-radius: 5px;
        font-weight: bold;
      }

      .approve-button {
        background-color: #4caf50;
      }

      .reject-button {
        background-color: #f44336;
      }

      .button:link,
      .button:visited,
      .button:active,
      .button:hover {
        color: #ffffff !important;
      }

      .footer {
        margin-top: 40px;
        font-size: 14px;
        color: #999999;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Nueva compañía pendiente de verificación</h1>
      <p>
        Se ha registrado una nueva compañía en FitConnect que requiere verificación. Por favor, revisa los detalles a continuación y decide si aprobar o rechazar la solicitud.
      </p>

      <div class="data-section">
        <h2>Datos de la compañía</h2>
        <div class="data-item"><strong>Nombre:</strong> ${
          company.name || 'N/A'
        }</div>
        <div class="data-item"><strong>Email:</strong> ${
          company.email || 'N/A'
        }</div>
        <div class="data-item"><strong>Teléfono:</strong> ${
          company.phoneNumber || 'N/A'
        }</div>
        <div class="data-item"><strong>Dirección:</strong> ${
          company.address || 'N/A'
        }</div>
      </div>

      <div class="data-section">
        <h2>Datos del usuario solicitante</h2>
        <div class="data-item"><strong>Nombre:</strong> ${
          user.name || 'N/A'
        }</div>
        <div class="data-item"><strong>Email:</strong> ${
          user.email || 'N/A'
        }</div>
        <div class="data-item"><strong>Teléfono:</strong> ${
          user.phoneNumber || 'N/A'
        }</div>
      </div>

      <p style="text-align: center;">
        <a href="${
          process.env.API_URL
        }/admin/verify-company?token=${companyTk}&verify=true" class="button approve-button">Aprobar compañía</a>
        <a href="${
          process.env.API_URL
        }/admin/verify-company?token=${companyTk}&verify=false" class="button reject-button">Rechazar compañía</a>
      </p>

      <p>
        Si tienes alguna duda, por favor contacta al equipo de soporte.
      </p>

      <div class="footer">
        © 2025 FitConnect. Todos los derechos reservados.
      </div>
    </div>
  </body>
</html>
  `;
};

export const sendSubscriptionExpiryWarning = (expiryDate: string) => `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tu suscripción está a punto de terminar</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #f4f7f6;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 40px auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 15px rgba(0,0,0,0.05);
        }
        .header {
            background-color: #2c3e50;
            color: #ffffff;
            text-align: center;
            padding: 30px 20px;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }
        .content {
            padding: 30px;
        }
        .content p {
            margin-bottom: 20px;
            font-size: 16px;
        }
        .highlight {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 0 4px 4px 0;
        }
        .highlight p {
            margin: 0;
            color: #856404;
            font-weight: 500;
        }
        .cta-container {
            text-align: center;
            margin: 30px 0;
        }
        .cta-button {
            display: inline-block;
            background-color: #3498db;
            color: #ffffff;
            text-decoration: none;
            padding: 14px 30px;
            border-radius: 5px;
            font-weight: bold;
            font-size: 16px;
            transition: background-color 0.3s;
        }
        .cta-button:hover {
            background-color: #2980b9;
        }
        .benefits-list {
            margin: 20px 0;
            padding-left: 20px;
        }
        .benefits-list li {
            margin-bottom: 10px;
            font-size: 15px;
        }
        .footer {
            background-color: #ecf0f1;
            text-align: center;
            padding: 20px;
            font-size: 13px;
            color: #7f8c8d;
        }
        .footer a {
            color: #3498db;
            text-decoration: none;
        }
        /* Dark mode support for email clients */
        @media (prefers-color-scheme: dark) {
            body {
                background-color: #1a1a1a;
            }
            .container {
                background-color: #2d2d2d;
            }
            .content, .content p, .benefits-list li {
                color: #e0e0e0;
            }
            .highlight {
                background-color: #332b00;
                border-left-color: #ffc107;
            }
            .highlight p {
                color: #ffda6a;
            }
            .footer {
                background-color: #1f1f1f;
                color: #a0a0a0;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>¡Tu suscripción está por expirar!</h1>
        </div>
        
        <div class="content">
            <p>Hola <strong>[Nombre del Usuario]</strong>,</p>
            
            <p>Esperamos que estés disfrutando de todos los beneficios de tu cuenta <strong>[Nombre del Plan]</strong>. Te escribimos para recordarte que tu suscripción actual finalizará pronto.</p>
            
            <div class="highlight">
                <p>Fecha de vencimiento: <strong>${expiryDate}</strong></p>
            </div>
            
            <p>Para asegurarte de no perder el acceso a tus funciones favoritas y mantener tu progreso, te recomendamos renovar tu suscripción antes de esta fecha.</p>
            
            <p>Al renovar, seguirás disfrutando de:</p>
            <ul class="benefits-list">
                <li>Acceso ininterrumpido a todas las funciones premium.</li>
                <li>Soporte prioritario 24/7.</li>
                <li>Actualizaciones y nuevas características exclusivas.</li>
            </ul>
            
            <div class="cta-container">
                <a href="[Enlace de Renovación]" class="cta-button">Renovar mi Suscripción Ahora</a>
            </div>
            
            <p>Si tienes alguna pregunta o necesitas ayuda con el proceso de renovación, no dudes en responder a este correo o visitar nuestro centro de ayuda.</p>
            
            <p>¡Gracias por ser parte de nuestra comunidad!</p>
            
            <p>Atentamente,<br>El equipo de <strong>[Nombre de tu Empresa]</strong></p>
        </div>
        
        <div class="footer">
            <p>Has recibido este correo porque estás suscrito a los servicios de [Nombre de tu Empresa].</p>
            <p><a href="[Enlace a Preferencias]">Administrar preferencias de correo</a> | <a href="[Enlace a Política de Privacidad]">Política de Privacidad</a></p>
            <p>&copy; ${moment().year()} FitConnect. Todos los derechos reservados.</p>
        </div>
    </div>
</body>
</html>

`;

export const deleteAccountHtml = () => `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Borrar Cuenta - Fitconnect</title>
        <style>
          body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background-color: #f9f9f9; }
          .card { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 500px; width: 90%; }
          h1 { color: #333; margin-top: 0; text-align: center; }
          p { color: #666; margin-bottom: 1rem; line-height: 1.5; }
          ol { color: #444; padding-left: 1.5rem; }
          li { margin-bottom: 0.5rem; }
          strong { color: #000; }
          .footer { margin-top: 2rem; font-size: 0.8rem; color: #999; text-align: center; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Eliminar cuenta permanentemente</h1>
          <p>Si deseas borrar tu cuenta, sigue estos pasos dentro de la aplicación:</p>
          <ol>
            <li>Entra en la aplicación.</li>
            <li>Dirígete a la página de <strong>Ajustes</strong>.</li>
            <li>Posteriormente, desplazate al final de la página</li>
            <li>En la sección de <strong>Zona de Peligro</strong>, pulsa sobre <strong>Eliminar cuenta</strong>.</li>
            <li>Confirma la acción para completar el proceso.</li>
          </ol>
          <p>Esta acción es irreversible y eliminará todos tus datos asociados.</p>
          <div class="footer">
            Este es un endpoint puramente informativo.
          </div>
        </div>
      </body>
      </html>
    `;
