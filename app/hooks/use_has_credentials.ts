// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect, useState} from 'react';

import {getAllServerCredentials} from '@init/credentials';

export function useHasCredentials(): boolean | null {
    const [hasCredentials, setHasCredentials] = useState<boolean | null>(null);

    useEffect(() => {
        async function checkAuth() {
            const credentials = await getAllServerCredentials();
            setHasCredentials(credentials.length > 0);
        }
        checkAuth();
    }, []);

    return hasCredentials;
}
