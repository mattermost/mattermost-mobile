// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {useEffect} from 'react';
import {useIntl} from 'react-intl';
import {of as of$} from 'rxjs';
import {map, switchMap} from 'rxjs/operators';

import {SupportedServer} from '@constants';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {isMinimumServerVersion} from '@utils/helpers';
import {unsupportedServer} from '@utils/server';
import {isSystemAdmin} from '@utils/user';

import type {WithDatabaseArgs} from '@typings/database/database';
import type SystemModel from '@typings/database/models/servers/system';
import type UserModel from '@typings/database/models/servers/user';

type ServerVersionProps = WithDatabaseArgs & {
    version?: string;
    roles: string;
};

const {SERVER: {SYSTEM, USER}} = MM_TABLES;

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
    varsion: database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CONFIG).pipe(
        switchMap(({value}: {value: ClientConfig}) => of$(value.Version)),
    ),
    roles: database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_USER_ID).pipe(
        switchMap(
            ({value}) => database.get<UserModel>(USER).findAndObserve(value).pipe(
                // eslint-disable-next-line max-nested-callbacks
                map((user) => user.roles),
            ),
        ),
    ),
}));

export default withDatabase(enahanced(ServerVersion));
