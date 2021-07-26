// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {useEffect} from 'react';
import {useIntl} from 'react-intl';

import {View} from '@constants';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {isMinimumServerVersion} from '@utils/helpers';
import {unsupportedServer} from '@utils/supported_server/supported_server';
import {isSystemAdmin} from '@utils/user';

import type {WithDatabaseArgs} from '@typings/database/database';
import type SystemModel from '@typings/database/models/servers/system';
import type UserModel from '@typings/database/models/servers/user';

type WithUserArgs = WithDatabaseArgs & {
    currentUserId: SystemModel;
}

type ServerVersionProps = WithDatabaseArgs & {
    config: SystemModel;
    user: UserModel;
};

const {SERVER: {SYSTEM, USER}} = MM_TABLES;

const ServerVersion = ({config, user}: ServerVersionProps) => {
    const intl = useIntl();

    useEffect(() => {
        const serverVersion = (config.value?.Version) || '';

        if (serverVersion) {
            const {RequiredServer: {MAJOR_VERSION, MIN_VERSION, PATCH_VERSION}} = View;
            const isSupportedServer = isMinimumServerVersion(serverVersion, MAJOR_VERSION, MIN_VERSION, PATCH_VERSION);

            if (!isSupportedServer) {
                // Only display the Alert if the TOS does not need to show first
                unsupportedServer(isSystemAdmin(user.roles), intl.formatMessage);
            }
        }
    }, [config.value?.Version, user.roles]);

    return null;
};

const withSystem = withObservables([], ({database}: WithDatabaseArgs) => ({
    currentUserId: database.collections.get(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_USER_ID),
    config: database.collections.get(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CONFIG),
}));

const withUser = withObservables(['currentUserId'], ({currentUserId, database}: WithUserArgs) => ({
    user: database.collections.get(USER).findAndObserve(currentUserId.value),
}));

export default withDatabase(withSystem(withUser(ServerVersion)));
