import dotenv from "dotenv";
dotenv.config();

export const emailHtml = (emailVerificationTk: string) => {
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
  const color = success ? "#4CAF50" : "#F44336";
  const icon = success ? "✅" : "❌";
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

    