const { app } = require('@azure/functions');
const { BlobServiceClient } = require('@azure/storage-blob');

const CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const SYNC_SECRET = process.env.SYNC_SECRET;
const CONTAINER_NAME = process.env.CONTAINER_NAME || 'pra-sync';
const BLOB_NAME = process.env.BLOB_NAME || 'sync.json';

function mergeArrayById(local, remote) {
  const map = new Map();
  (remote || []).forEach(item => map.set(item.id, item));
  (local || []).forEach(item => map.set(item.id, item));
  return Array.from(map.values());
}

function mergeArrayByType(local, remote) {
  const map = new Map();
  (remote || []).forEach(item => map.set(item.type, item));
  (local || []).forEach(item => map.set(item.type, item));
  return Array.from(map.values());
}

function mergeSet(local, remote) {
  return Array.from(new Set([...(remote || []), ...(local || [])]));
}

function mergePra(local, remote) {
  if (!remote) return local;
  if (!local) return remote;

  const localTime = local.exportedAt ? new Date(local.exportedAt).getTime() : 0;
  const remoteTime = remote.exportedAt ? new Date(remote.exportedAt).getTime() : 0;
  const newer = localTime >= remoteTime ? local : remote;

  return {
    version: newer.version || 1,
    exportedAt: new Date().toISOString(),
    language: newer.language,
    theme: newer.theme,
    name: newer.name,
    history: mergeArrayById(local.history, remote.history),
    activities: mergeArrayByType(local.activities, remote.activities),
    hiddenDefaultActivities: mergeSet(local.hiddenDefaultActivities, remote.hiddenDefaultActivities),
    moodScale: newer.moodScale,
    info: newer.info,
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
