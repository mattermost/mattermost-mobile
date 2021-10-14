// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import React from 'react';
import {View} from 'react-native';
import {switchMap} from 'rxjs/operators';

import ProfilePicture from '@components/profile_picture';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {makeStyleSheetFromTheme} from '@utils/theme';

import type {WithDatabaseArgs} from '@typings/database/database';
import type SystemModel from '@typings/database/models/servers/system';
import type UserModel from '@typings/database/models/servers/user';

type Props = {
    currentUser: UserModel;
    isFocused: boolean;
    theme: Theme;
}

const {SERVER: {SYSTEM, USER}} = MM_TABLES;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    selected: {
        borderWidth: 2,
        borderColor: theme.buttonBg,
        borderRadius: 20,
    },
}));

const Account = ({currentUser, isFocused, theme}: Props) => {
    const style = getStyleSheet(theme);

    return (
        <View style={isFocused ? style.selected : undefined}>
            <ProfilePicture
                author={currentUser}
                showStatus={false}
                size={28}
            />
        </View>
    );
};

const withCurrentUser = withObservables([], ({database}: WithDatabaseArgs) => ({
    currentUser: database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_USER_ID).pipe(
        switchMap((id) => database.get(USER).findAndObserve(id.value)),
    ),
}));

export default withDatabase(withCurrentUser(Account));
