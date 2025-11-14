// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {of as of$} from 'rxjs';

export const observeIsAIEnabled = () => {
    // For now, return true as AI availability will be determined by the server
    // In the future, this could check plugin availability via config or plugins manifest
    // Similar to how NPS plugin is checked in app/actions/remote/nps.ts
    return of$(true);
};

