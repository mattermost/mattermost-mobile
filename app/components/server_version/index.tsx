// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {useEffect} from 'react';
import {useIntl} from 'react-intl';
import {map} from 'rxjs/operators';

import {SupportedServer} from '@constants';
import {observeConfigValue} from '@queries/servers/system';
import {observeCurrentUser} from '@queries/servers/user';
import {isMinimumServerVersion} from '@utils/helpers';
import {unsupportedServer} from '@utils/server';
import {isSystemAdmin} from '@utils/user';

import type {WithDatabaseArgs} from '@typings/database/database';

type ServerVersionProps = WithDatabaseArgs & {
    version?: string;
    roles: string;
};

const ServerVersion = ({version, roles}: ServerVersionProps) => {
    const intl = useIntl();

    useEffect(() => {
        const serverVersion = version || '';

        if (serverVersion) {
            const {MAJOR_VERSION, MIN_VERSION, PATCH_VERSION} = SupportedServer;
            const isSupportedServer = isMinimumServerVersion(serverVersion, MAJOR_VERSION, MIN_VERSION, PATCH_VERSION);

            if (!isSupportedServer) {
                // Only display the Alert if the TOS does not need to show first
                unsupportedServer(isSystemAdmin(roles), intl);
            }
        }
    }, [version, roles]);

    return null;
};

const enahanced = withObservables([], ({database}: WithDatabaseArgs) => ({
    version: observeConfigValue(database, 'Version'),
    roles: observeCurrentUser(database).pipe(
        map((user) => user?.roles),
    ),
}));

export default withDatabase(enahanced(ServerVersion));
