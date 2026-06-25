# Non-rotating Refresh Tokens with Lazy Expiry Extension

To prevent concurrency bugs and race conditions in frontend clients (such as multiple parallel API requests triggering simultaneous token refreshes), we decided to use non-rotating, persistent refresh tokens that only extend their expiration date when close to expiry (less than 7 days remaining). This ensures that the token string value remains stable for the user session, while maintaining standard session control and security.
