// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Runs inside Maestro's JavaScript runtime via `runScript`, not Node: there are no imports,
// `http` is Maestro's built-in client, and every `--env` value and `runScript` `env` entry
// is a global. Patches SupportSettings.AllowDownloadLogs so the flow that needs the flag off
// can set it on start and restore it on completion, identically in CI and locally.
/* global http, SITE_1_URL, ADMIN_TOKEN, ALLOW_DOWNLOAD_LOGS */

const enabled = String(ALLOW_DOWNLOAD_LOGS) === 'true';
const response = http.put(`${SITE_1_URL}/api/v4/config/patch`, {
    headers: {
        Authorization: `Bearer ${ADMIN_TOKEN}`,
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({SupportSettings: {AllowDownloadLogs: enabled}}),
});

if (!response.ok) {
    throw new Error(`Patching SupportSettings.AllowDownloadLogs=${enabled} failed: HTTP ${response.status} ${response.body}`);
}
