const { app } = require('@azure/functions');
const { BlobServiceClient } = require('@azure/storage-blob');

const CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const SYNC_SECRET = process.env.SYNC_SECRET;
const CONTAINER_NAME = process.env.CONTAINER_NAME || 'pra-sync';
const BLOB_NAME = process.env.BLOB_NAME || 'sync.json';

function mergeSet(local, remote) {
  return Array.from(new Set([...(remote || []), ...(local || [])]));
}

// Merge DayEntry[] by date, Activity[] within each day by id, apply tombstones
function mergeHistory(localDays, remoteDays, deletedRecordIds, deletedActivityTypes) {
  const deletedIds = new Set(deletedRecordIds || []);
  const deletedTypes = new Set(deletedActivityTypes || []);
  const dayMap = new Map();

  for (const days of [remoteDays || [], localDays || []]) {
    for (const day of days) {
      const existing = dayMap.get(day.date);
      if (!existing) {
        dayMap.set(day.date, { ...day, activities: [...(day.activities || [])] });
      } else {
        const actMap = new Map(existing.activities.map(a => [a.id, a]));
        for (const act of (day.activities || [])) {
          if (!actMap.has(act.id)) actMap.set(act.id, act);
        }
        existing.activities = Array.from(actMap.values());
      }
    }
  }

  const result = [];
  for (const day of dayMap.values()) {
    const filtered = (day.activities || []).filter(
      a => !deletedIds.has(a.id) && !deletedTypes.has(a.type)
    );
    if (filtered.length > 0) result.push({ ...day, activities: filtered });
  }
  return result.sort((a, b) => b.date.localeCompare(a.date));
}

// Merge ActivityDefinition[] by type, filter out deleted types
// For existing types: stored (remote) wins for most fields, properties[] are unioned
// New types from incoming (local) are added
function mergeActivities(local, remote, deletedTypes) {
  const deletedSet = new Set(deletedTypes || []);
  const localMap = new Map((local || []).map(item => [item.type, item]));
  const remoteMap = new Map((remote || []).map(item => [item.type, item]));
  const allTypes = new Set([...localMap.keys(), ...remoteMap.keys()]);
  const result = [];
  for (const type of allTypes) {
    if (deletedSet.has(type)) continue;
    const l = localMap.get(type);
    const r = remoteMap.get(type);
    if (!r) { result.push(l); continue; }
    if (!l) { result.push(r); continue; }
    // Both exist: stored wins for all fields, but union properties[]
    const props = (l.properties || r.properties)
      ? [...new Set([...(r.properties || []), ...(l.properties || [])])]
      : undefined;
    result.push({ ...r, properties: props });
  }
  return result;
}

// Merge notes objects ({cs?: {...}, en?: {...}})
function mergeNotes(local, remote) {
  if (!local && !remote) return undefined;
  const result = {};
  for (const lang of ['cs', 'en']) {
    const l = (local || {})[lang] || {};
    const r = (remote || {})[lang] || {};
    const merged = { ...r, ...l }; // local wins per key
    if (Object.keys(merged).length > 0) result[lang] = merged;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function mergePra(local, remote) {
  if (!remote) return local;
  if (!local) return remote;

  const localTime = local.exportedAt ? new Date(local.exportedAt).getTime() : 0;
  const remoteTime = remote.exportedAt ? new Date(remote.exportedAt).getTime() : 0;
  const newer = localTime >= remoteTime ? local : remote;

  // Tombstones — union from both sides
  const deletedRecordIds = mergeSet(local.deletedRecordIds, remote.deletedRecordIds);
  const userDeleted = mergeSet(local.userDeleted, remote.userDeleted);

  // Session: keep the more recent start time
  let sessionStart = local.sessionStart || remote.sessionStart;
  if (local.sessionStart && remote.sessionStart) {
    sessionStart = local.sessionStart > remote.sessionStart
      ? local.sessionStart
      : remote.sessionStart;
  }

  return {
    version: newer.version || 1,
    exportedAt: new Date().toISOString(),
    language: newer.language,
    theme: newer.theme,
    name: newer.name,
    sessionStart,
    // History: merge by date+id, filter tombstones
    history: mergeHistory(local.history, remote.history, deletedRecordIds, userDeleted),
    // Activity definitions: merge by type, filter deleted
    activities: mergeActivities(local.activities, remote.activities, userDeleted),
    // Sets: union
    hiddenActivities: mergeSet(local.hiddenActivities, remote.hiddenActivities),
    hiddenProperties: mergeSet(local.hiddenProperties, remote.hiddenProperties),
    hiddenDurations: mergeSet(local.hiddenDurations, remote.hiddenDurations),
    durationBubbles: mergeSet(local.durationBubbles, remote.durationBubbles),
    userModified: mergeSet(local.userModified, remote.userModified),
    // Newer wins
    moodScale: newer.moodScale,
    info: newer.info,
    notes: mergeNotes(local.notes, remote.notes),
    // Tombstones
    deletedRecordIds,
    userDeleted,
  };
}

app.http('sync', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return { status: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
    }

    if (!SYNC_SECRET || body.secret !== SYNC_SECRET) {
      return { status: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    const incoming = body.data;
    if (!incoming) {
      return { status: 400, body: JSON.stringify({ error: 'Missing data' }) };
    }

    try {
      const blobServiceClient = BlobServiceClient.fromConnectionString(CONNECTION_STRING);
      const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
      await containerClient.createIfNotExists();
      const blobClient = containerClient.getBlockBlobClient(BLOB_NAME);

      let stored = null;
      try {
        const download = await blobClient.download();
        const chunks = [];
        for await (const chunk of download.readableStreamBody) {
          chunks.push(chunk);
        }
        stored = JSON.parse(Buffer.concat(chunks).toString('utf-8'));
      } catch (e) {
        stored = null;
      }

      const merged = mergePra(incoming, stored);
      const mergedStr = JSON.stringify(merged);

      await blobClient.upload(mergedStr, Buffer.byteLength(mergedStr), {
        blobHTTPHeaders: { blobContentType: 'application/json' },
        conditions: {},
      });

      return { status: 200, body: mergedStr };
    } catch (e) {
      context.error('Sync error:', e);
      return {
        status: 500,
        body: JSON.stringify({ error: 'Internal error', detail: e.message }),
      };
    }
  },
});
