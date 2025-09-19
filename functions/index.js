// functions/index.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const wash = require("washyourmouthoutwithsoap");

// Initialize Admin (safe if called once)
try { admin.initializeApp(); } catch (_) {}

exports.checkProfanity = functions
  .region("europe-west1") // <- keep this region; we'll use the same in the client
  .https.onCall((data, context) => {
    const text = (data && data.text) || "";
    const locale = ((data && data.locale) || "cs").toLowerCase();

    if (typeof text !== "string" || !text.trim()) {
      return { contains: false };
    }

    try {
      // Use Czech list
      const contains = wash.check(locale, text);
      return { contains };
    } catch {
      // Fallback to English list if 'cs' failed for any reason
      try { return { contains: wash.check("en", text) }; }
      catch { return { contains: false }; }
    }
  });
