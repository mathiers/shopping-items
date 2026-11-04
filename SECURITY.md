# Security Policy

## Reporting vulnerabilities

Please report security vulnerabilities privately to the project maintainer rather than opening a public GitHub issue containing sensitive information.

## Authentication

Shopping Items uses Appwrite for account authentication.

Biometric verification uses device authentication through Expo Local Authentication.

## Sensitive information

Never commit:
- Appwrite API keys or administrator credentials
- Passwords or authentication tokens
- Production environment secrets
- Personal shopping data

## Development practices

- Run TypeScript validation before merging changes.
- Review authentication changes carefully.
- Test biometric features on physical Android devices.
- Keep dependencies updated and review security advisories.

## Current limitations

Automatic biometric app locking and password fallback are not yet implemented.
