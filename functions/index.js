const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const crypto = require("crypto");

admin.initializeApp();
const db = admin.database();

// ── Cloudinary secrets (set once via Firebase CLI) ──
// Run these commands in your terminal:
//   firebase functions:secrets:set CLOUDINARY_API_KEY
//   firebase functions:secrets:set CLOUDINARY_API_SECRET
//   firebase functions:secrets:set CLOUDINARY_CLOUD_NAME
const CLOUDINARY_API_KEY    = defineSecret("CLOUDINARY_API_KEY");
const CLOUDINARY_API_SECRET = defineSecret("CLOUDINARY_API_SECRET");
const CLOUDINARY_CLOUD_NAME = defineSecret("CLOUDINARY_CLOUD_NAME");

/**
 * Runs once per day at 03:00 Prague time.
 * 1. Deletes Cloudinary images for expired unverified-users
 * 2. Deletes expired Firebase records (unverified-users, reports, system-logs)
 */
exports.dailyCleanup = onSchedule(
  {
    schedule: "every day 03:00",
    timeZone: "Europe/Prague",
    retryCount: 0,
    maxInstances: 1,
    secrets: [CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUDINARY_CLOUD_NAME],
  },
  async () => {
    const now = Date.now();
    console.log("Daily cleanup started at", new Date(now).toISOString());

    // Step 1: Clean Cloudinary images for expired unverified-users FIRST
    await cleanupUnverifiedUsers(now);

    // Step 2: Clean expired Firebase records
    await cleanupExpired("reports", now);
    await cleanupExpired("system-logs", now);

    console.log("Daily cleanup finished");
  }
);

// ── Cloudinary image deletion ──────────────────────────────────────────────

async function cloudinaryDestroy(publicId) {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const apiSecret = CLOUDINARY_API_SECRET.value();
    const apiKey    = CLOUDINARY_API_KEY.value();
    const cloudName = CLOUDINARY_CLOUD_NAME.value();

    // Sign: SHA-1("public_id=...&timestamp=...{secret}")
    const str = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash("sha1").update(str).digest("hex");

    const form = new URLSearchParams();
    form.append("public_id", publicId);
    form.append("timestamp",  String(timestamp));
    form.append("api_key",    apiKey);
    form.append("signature",  signature);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
      { method: "POST", body: form }
    );

    const data = await res.json();
    if (data.result === "ok") {
      console.log(`  Cloudinary deleted: ${publicId}`);
    } else {
      console.warn(`  Cloudinary result for ${publicId}:`, data.result);
    }
  } catch (e) {
    // Never block cleanup over a single image failure
    console.warn(`  Cloudinary destroy failed for ${publicId}:`, e.message);
  }
}

// ── Unverified-users cleanup (Cloudinary + Firebase) ──────────────────────

async function cleanupUnverifiedUsers(now) {
  const ref = db.ref("unverified-users");

  const snapshot = await ref
    .orderByChild("expiresAt")
    .endAt(now)
    .once("value");

  if (!snapshot.exists()) {
    console.log("No expired unverified-users");
    return;
  }

  const deletions = [];

  snapshot.forEach(child => {
    const uid  = child.key;
    const data = child.val() || {};

    console.log(`Processing expired unverified-user: ${uid}`);

    // Delete profile picture
    deletions.push(cloudinaryDestroy(`users/${uid}/pfp`));

    // Delete gallery images
    const gallery = data.gallery;
    if (gallery) {
      const items = Array.isArray(gallery) ? gallery : Object.values(gallery);
      items.forEach(img => {
        const pid = img?.publicId || img?.public_id;
        if (pid) deletions.push(cloudinaryDestroy(pid));
      });
    }
  });

  // Run all Cloudinary deletes in parallel
  await Promise.allSettled(deletions);

  // Now delete the Firebase records
  const updates = {};
  snapshot.forEach(child => { updates[child.key] = null; });
  await ref.update(updates);

  console.log(`Deleted ${Object.keys(updates).length} expired unverified-user(s) from Firebase`);
}

// ── Generic expired-record cleanup ────────────────────────────────────────

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
  snapshot.forEach(child => { updates[child.key] = null; });
  await ref.update(updates);

  console.log(`Deleted ${Object.keys(updates).length} expired record(s) from ${path}`);
}