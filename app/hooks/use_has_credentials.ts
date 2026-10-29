// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useState} from 'react';

import DatabaseManager from '@database/manager';
import useDidMount from '@hooks/did_mount';
import {getAllServerCredentials} from '@init/credentials';
import {logError} from '@utils/log';

export function useHasCredentials(requireActiveServerDatabase = false): boolean | null {
    const [hasCredentials, setHasCredentials] = useState<boolean | null>(null);

    useDidMount(() => {
        let mounted = true;
        async function checkAuth() {
            try {
                const credentials = await getAllServerCredentials();
                let usableCredentials = credentials.length > 0;
                if (requireActiveServerDatabase && usableCredentials) {
                    const activeServerUrl = await DatabaseManager.getActiveServerUrl();
                    const activeDatabase = activeServerUrl ? await DatabaseManager.getActiveServerDatabase() : undefined;
                    usableCredentials = Boolean(
                        activeServerUrl &&
                        activeDatabase &&
                        credentials.some((credential) => credential.serverUrl === activeServerUrl),
                    );
                }
                if (mounted) {
                    setHasCredentials(usableCredentials);
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
