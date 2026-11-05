# Environment credential remediation

The repository tracked a .env file. Removing it from the current tree does not revoke any values present in Git history. Do not print or copy its values into PRs, build logs, frontend variables, or deployment payloads.

Before backend release, rotate any database credentials or signing keys that were committed. For MongoDB, create a replacement least-privilege database user for the SAME existing database, configure the replacement URI privately in backend hosting, verify connectivity without writes, then revoke the old credential. Do not create a replacement database, import sample data, drop collections or change existing records. Rotating a JWT signing key invalidates existing sessions.

This PR removes tracking only. It does not change hosted secrets, revoke access, rewrite history or touch MongoDB. Rotation must be completed in the account/provider settings before backend release.
