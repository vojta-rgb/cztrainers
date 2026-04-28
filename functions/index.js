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

    // Step 2: Clean expired unverified app-users (never verified their email)
    await cleanupExpiredAppUsers(now);

    // Step 3: Clean expired Firebase records
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

    // Use application/x-www-form-urlencoded — most reliable for Cloudinary destroy
    const body = new URLSearchParams({
      public_id: publicId,
      timestamp: String(timestamp),
      api_key:   apiKey,
      signature: signature,
    }).toString();

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      }
    );

    const text = await res.text(); // read as text first to debug
    console.debug(`  Cloudinary raw response for ${publicId}: ${text}`);

    let data;
    try { data = JSON.parse(text); } catch { data = {}; }

    if (data.result === "ok") {
      console.log(`  Cloudinary deleted: ${publicId}`);
    } else if (data.result === "not found") {
      console.log(`  Cloudinary: already gone or never existed: ${publicId}`);
    } else {
      console.warn(`  Cloudinary unexpected result for ${publicId}:`, text);
    }
  } catch (e) {
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

// ── Expired app-users cleanup (unverified normal users) ──────────────────

async function cleanupExpiredAppUsers(now) {
  const ref = db.ref("app-users");

  const snapshot = await ref
    .orderByChild("expiresAt")
    .endAt(now)
    .once("value");

  if (!snapshot.exists()) {
    console.log("No expired app-users");
    return;
  }

  const uids = [];
  snapshot.forEach(child => {
    // Double-check: only delete if emailVerified is still false
    // (expiresAt should already be null for verified users but this is a safety net)
    const data = child.val() || {};
    if (!data.emailVerified) {
      uids.push(child.key);
      console.log(`Processing expired app-user: ${child.key}`);
    }
  });

  if (uids.length === 0) {
    console.log("No unverified app-users to delete");
    return;
  }

  // Delete Firebase Auth accounts
  await Promise.allSettled(
    uids.map(async uid => {
      try {
        await admin.auth().deleteUser(uid);
        console.log(`  Auth account deleted: ${uid}`);
      } catch (e) {
        if (e.code === "auth/user-not-found") {
          console.log(`  Auth account already gone: ${uid}`);
        } else {
          console.warn(`  Auth delete failed for ${uid}:`, e.message);
        }
      }
    })
  );

  // Delete app-users records
  const updates = {};
  uids.forEach(uid => { updates[uid] = null; });
  await ref.update(updates);

  console.log(`Deleted ${uids.length} expired app-user(s)`);
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