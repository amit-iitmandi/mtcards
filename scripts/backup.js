// Secrets are read from the runtime environment; command arguments contain no credentials.
const fs = require("fs/promises");
const { MongoClient } = require("mongoose").mongo;
const { createBackup, restoreBackup } = require("../services/backup");
(async () => {
  const mode = process.argv[2];
  if (!["backup", "restore"].includes(mode))
    throw Error("Choose backup or restore");
  const uri = process.env.BACKUP_MONGODB_URI || process.env.DATABASE_ACCESS;
  if (!uri || !process.env.BACKUP_FILE || !process.env.BACKUP_ENCRYPTION_KEY)
    throw Error("Backup environment is incomplete");
  const key = Buffer.from(process.env.BACKUP_ENCRYPTION_KEY, "base64");
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
  try {
    await client.connect();
    if (mode === "backup") {
      const output = await createBackup(
        client,
        process.env.BACKUP_SOURCE_DATABASE,
        key,
      );
      await fs.writeFile(process.env.BACKUP_FILE, output, {
        mode: 0o600,
        flag: "wx",
      });
      console.log(JSON.stringify({ status: "encrypted-backup-created" }));
    } else {
      const output = await restoreBackup(
        client,
        process.env.BACKUP_RESTORE_DATABASE,
        await fs.readFile(process.env.BACKUP_FILE),
        key,
      );
      console.log(JSON.stringify({ status: "restore-verified", ...output }));
    }
  } finally {
    await client.close();
  }
})().catch(() => {
  console.error(
    "Backup/recovery failed; check configuration, target isolation and protected operator logs.",
  );
  process.exitCode = 1;
});
