// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ensureString} from '@utils/types';
import {getScheme} from '@utils/url';

import type {LiveKitSessionResponse} from '@calls/types/calls';

// LiveKit maps https to wss and http to ws; the insecure forms are allowed only when the server itself is plain http.
function isAllowedRoomUrl(roomUrl: string, serverUrl: string) {
    const scheme = getScheme(roomUrl)?.toLowerCase();

    // getScheme is unanchored, so it would also match a scheme embedded later in the string.
    if (!scheme || !roomUrl.toLowerCase().startsWith(`${scheme}://`)) {
        return false;
    }

    const isSecure = scheme === 'wss' || scheme === 'https';
    const isInsecure = scheme === 'ws' || scheme === 'http';

    return isSecure || (isInsecure && getScheme(serverUrl)?.toLowerCase() === 'http');
}

export function isLiveKitSessionResponse(v: unknown, serverUrl: string): v is LiveKitSessionResponse {
    if (typeof v !== 'object' || !v) {
        return false;
    }

    const {session_id: sessionId, token, url, call_state: callState} = v as Record<string, unknown>;
    return Boolean(ensureString(sessionId)) &&
        Boolean(ensureString(token)) &&
        isAllowedRoomUrl(ensureString(url), serverUrl) &&
        typeof callState === 'object' && callState !== null && Array.isArray((callState as {sessions?: unknown}).sessions);
}
