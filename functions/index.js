const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { defineSecret } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const webpush = require('web-push');

admin.initializeApp();
const db = admin.firestore();

const VAPID_PUBLIC_KEY = defineSecret('VAPID_PUBLIC_KEY');
const VAPID_PRIVATE_KEY = defineSecret('VAPID_PRIVATE_KEY');

// Sends one payload to every stored subscription, dropping any that the push
// service reports as gone (410/404) — those are stale endpoints (browser
// data cleared, extension uninstalled, etc.), not something to keep retrying.
async function sendToAllSubscriptions(payload) {
  webpush.setVapidDetails(
    'mailto:nick@rochesterchristian.church',
    VAPID_PUBLIC_KEY.value(),
    VAPID_PRIVATE_KEY.value()
  );

  const snap = await db.collection('pushSubscriptions').get();
  if (snap.empty) return;

  const body = JSON.stringify(payload);
  await Promise.all(snap.docs.map(async (doc) => {
    const sub = doc.data();
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        body
      );
    } catch (err) {
      if (err && (err.statusCode === 404 || err.statusCode === 410)) {
        await doc.ref.delete().catch(() => {});
      } else {
        logger.warn('push send failed', doc.id, err && err.statusCode, err && err.message);
      }
    }
  }));
}

exports.sendPushOnAnnouncement = onDocumentWritten(
  { document: 'settings/announcement', secrets: [VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY] },
  async (event) => {
    const before = event.data.before.exists ? event.data.before.data() : null;
    const after = event.data.after.exists ? event.data.after.data() : null;
    if (!after || !after.text) return;
    if (before && before.text === after.text) return;

    await sendToAllSubscriptions({
      title: 'RCU Intramurals announcement',
      body: after.text.slice(0, 150),
      tag: 'announcement'
    });
  }
);

exports.sendPushOnMatchupChange = onDocumentWritten(
  { document: 'matchups/{matchupId}', secrets: [VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY] },
  async (event) => {
    const before = event.data.before.exists ? event.data.before.data() : null;
    const after = event.data.after.exists ? event.data.after.data() : null;
    if (!after || !after.date) return;

    const changed = !before
      || before.date !== after.date
      || before.time !== after.time
      || before.location !== after.location;
    if (!changed) return;

    const when = after.date + (after.time ? ' at ' + after.time : '') + (after.location ? ' — ' + after.location : '');
    await sendToAllSubscriptions({
      title: 'Schedule updated',
      body: (after.sport || 'Game') + ': ' + after.teamA + ' vs ' + after.teamB + ' — ' + when,
      tag: 'schedule-' + event.params.matchupId
    });
  }
);

exports.sendPushOnDevotionalChange = onDocumentWritten(
  { document: 'settings/devotionalPlan', secrets: [VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY] },
  async (event) => {
    const before = event.data.before.exists ? event.data.before.data() : null;
    const after = event.data.after.exists ? event.data.after.data() : null;
    if (!after || !after.baseUrl) return;
    if (before && before.baseUrl === after.baseUrl) return;

    await sendToAllSubscriptions({
      title: 'New devotional plan',
      body: after.title || 'A new reading plan is up in the Devotional tab.',
      tag: 'devotional'
    });
  }
);
