# Security Policy

## Supported Versions

Only the latest published version on npm is supported with security fixes.
Older versions are not patched; users are encouraged to upgrade.

| Version | Supported |
|---|---|
| latest | ✅ |
| previous | ❌ |

## Reporting a Vulnerability

Please **do not open a public issue** for security vulnerabilities.

Report vulnerabilities privately via GitHub's security advisory feature:

1. Go to https://github.com/ThomasSanna/opencode-tell-sessions/security/advisories
2. Click **New draft security advisory**
3. Fill in the details (affected version, impact, reproduction steps)

You can also email the maintainer directly through the contact address shown
on the GitHub profile.

You should receive an acknowledgment within 48 hours. We ask that you allow
up to 90 days for a fix before publicly disclosing the vulnerability, and
that you do not disclose details until a fix is published.

## Scope

This plugin runs inside OpenCode and interacts with other sessions on the
same server. Report issues in the plugin's code (token handling, session
resolution, message injection) here. For vulnerabilities in OpenCode itself,
report them to the OpenCode project.
