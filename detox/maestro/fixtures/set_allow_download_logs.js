// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Runs inside Maestro's JavaScript runtime via `runScript`, not Node: there are no imports,
// `http` is Maestro's built-in client, and every `--env` value and `runScript` `env` entry
// is a global. Patches SupportSettings.AllowDownloadLogs so the flow that needs the flag off
// can set it on start and restore it on completion, identically in CI and locally.
/* global http, SITE_1_URL, ADMIN_TOKEN, ALLOW_DOWNLOAD_LOGS */

const enabled = String(ALLOW_DOWNLOAD_LOGS) === 'true';

// The PATCH is idempotent, and Cloudflare in front of the test servers answers 5xx while the
// origin is still busy — a 524 here failed the whole flow once. Retry the gateway errors only;
// a 4xx is a real rejection and must surface on the first attempt.
let response = null;
for (let attempt = 0; attempt < 4; attempt++) {
    response = http.put(`${SITE_1_URL}/api/v4/config/patch`, {
        headers: {
            Authorization: `Bearer ${ADMIN_TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({SupportSettings: {AllowDownloadLogs: enabled}}),
    });

    if (response.ok || response.status < 500) {
        break;
    }
}

if (!response.ok) {
    throw new Error(`Patching SupportSettings.AllowDownloadLogs=${enabled} failed: HTTP ${response.status} ${response.body}`);
}
