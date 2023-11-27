// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {useEffect} from 'react';
import {type IntlShape, useIntl} from 'react-intl';
import {distinctUntilChanged, map} from 'rxjs/operators';

import {setLastServerVersionCheck} from '@actions/local/systems';
import {useServerUrl} from '@context/server';
import {getServer} from '@queries/app/servers';
import {observeConfigValue, observeLastServerVersionCheck} from '@queries/servers/system';
import {observeCurrentUser} from '@queries/servers/user';
import {isSupportedServer, unsupportedServer} from '@utils/server';
import {isSystemAdmin} from '@utils/user';

import type {WithDatabaseArgs} from '@typings/database/database';

type ServerVersionProps = {
    isAdmin: boolean;
    lastChecked: number;
    version?: string;
};

const VALIDATE_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

const handleUnsupportedServer = async (serverUrl: string, isAdmin: boolean, intl: IntlShape) => {
    const serverModel = await getServer(serverUrl);
    unsupportedServer(serverModel?.displayName || '', isAdmin, intl);
    setLastServerVersionCheck(serverUrl);
};

const ServerVersion = ({isAdmin, lastChecked, version}: ServerVersionProps) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();

    useEffect(() => {
        const serverVersion = version || '';
        const shouldValidate = (Date.now() - lastChecked) >= VALIDATE_INTERVAL || !lastChecked;

        if (serverVersion && shouldValidate && !isSupportedServer(serverVersion)) {
            // Only display the Alert if the TOS does not need to show first
            handleUnsupportedServer(serverUrl, isAdmin, intl);
        }
    }, [version, isAdmin, lastChecked, serverUrl]);

    return null;
};

const enahanced = withObservables([], ({database}: WithDatabaseArgs) => ({
    lastChecked: observeLastServerVersionCheck(database),
    version: observeConfigValue(database, 'Version'),
    isAdmin: observeCurrentUser(database).pipe(
        map((user) => isSystemAdmin(user?.roles || '')),
        distinctUntilChanged(),
    ),
}));

export default withDatabase(enahanced(ServerVersion));
