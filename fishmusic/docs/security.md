# Security

## Access Control

- **Local**: M2ULTRA with FileVault enabled
- **External**: 12TB drive encrypted at rest
- **Cloud**: Google Drive with 2FA

## Sensitive Data

Never commit:
- API keys
- License files
- Personal information
- Unreleased masters

## Backup Strategy

| Location | Frequency | Retention |
|----------|-----------|-----------|
| Local SSD | Real-time | Active projects |
| 12TB External | Weekly | Permanent |
| Google Drive | Daily | Metadata only |

## Incident Response

1. Identify compromised data
2. Revoke access tokens
3. Rotate credentials
4. Document in security log

## Audit

- Review access logs monthly
- Verify backup integrity quarterly
- Update dependencies annually
