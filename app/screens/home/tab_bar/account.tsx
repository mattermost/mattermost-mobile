// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import React from 'react';
import {View} from 'react-native';

import ProfilePicture from '@components/profile_picture';
import {observeCurrentUser} from '@queries/servers/user';
import {makeStyleSheetFromTheme} from '@utils/theme';

import type {WithDatabaseArgs} from '@typings/database/database';
import type UserModel from '@typings/database/models/servers/user';

type Props = {
    currentUser?: UserModel;
    isFocused: boolean;
    theme: Theme;
}

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
                showStatus={true}
                size={28}
            />
        </View>
    );
};

const withCurrentUser = withObservables([], ({database}: WithDatabaseArgs) => ({
    currentUser: observeCurrentUser(database),
}));

export default withDatabase(withCurrentUser(Account));
