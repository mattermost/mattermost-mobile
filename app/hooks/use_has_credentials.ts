// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useState} from 'react';

import useDidMount from '@hooks/did_mount';
import {getAllServerCredentials} from '@init/credentials';
import {logError} from '@utils/log';

export function useHasCredentials(): boolean | null {
    const [hasCredentials, setHasCredentials] = useState<boolean | null>(null);

    useDidMount(() => {
        let mounted = true;
        async function checkAuth() {
            try {
                const credentials = await getAllServerCredentials();
                if (mounted) {
                    setHasCredentials(credentials.length > 0);
                }
            } catch (error) {
                logError('[useHasCredentials]', error);
                if (mounted) {
                    setHasCredentials(false);
                }
            }
        }
        checkAuth();
        return () => {
            mounted = false;
        };
    });

    return hasCredentials;
}
