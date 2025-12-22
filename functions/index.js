const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.database();

/**
 * Runs once per day.
 * Deletes expired data based on `expiresAt` timestamp.
 */
exports.dailyCleanup = onSchedule(
  {
    schedule: "every day 03:00",
    timeZone: "Europe/Prague",

    // HARD SAFETY LIMITS
    retryCount: 0,     // never retry automatically
    maxInstances: 1   // prevents parallel executions
  },
  async () => {
    const now = Date.now();
    console.log("Daily cleanup started");

    await cleanupExpired("unverified-users", now);
    await cleanupExpired("reports", now);
    await cleanupExpired("system-logs", now);

    console.log("Daily cleanup finished");
  }
);

async function cleanupExpired(path, now) {
  const ref = db.ref(path);

  const snapshot = await ref
    .orderByChild("expiresAt")
    .endAt(now)
    .once("value");

  if (!snapshot.exists()) {
    console.log(`No expired records in ${path}`);
    return;
  }

  const updates = {};
  snapshot.forEach(child => {
    updates[child.key] = null;
  });

  await ref.update(updates);
  console.log(`Deleted expired records in ${path}`);
}