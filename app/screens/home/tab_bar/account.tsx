// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import React from 'react';
import {View} from 'react-native';

import ProfilePicture from '@components/profile_picture';
import {BOTTOM_TAB_PROFILE_PHOTO_SIZE, BOTTOM_TAB_STATUS_SIZE} from '@constants/view';
import {observeCurrentUser} from '@queries/servers/user';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import type {WithDatabaseArgs} from '@typings/database/database';
import type UserModel from '@typings/database/models/servers/user';

type Props = {
    currentUser?: UserModel;
    isFocused: boolean;
    theme: Theme;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        borderWidth: 2,
        borderRadius: 20,
    },
    focused: {
        borderColor: theme.buttonBg,
    },
    unfocused: {
        borderColor: changeOpacity(theme.centerChannelColor, 0.48),
    },
}));

export const Account = ({currentUser, isFocused, theme}: Props) => {
    const style = getStyleSheet(theme);

    return (
        <View
            style={[isFocused ? style.focused : style.unfocused, style.container]}
            testID='account-container'
        >
            <ProfilePicture
                testID='account-profile-picture'
                author={currentUser}
                showStatus={true}
                size={BOTTOM_TAB_PROFILE_PHOTO_SIZE}
                statusSize={BOTTOM_TAB_STATUS_SIZE}
            />
        </View>
    );
};

const withCurrentUser = withObservables([], ({database}: WithDatabaseArgs) => ({
    currentUser: observeCurrentUser(database),
}));

export default withDatabase(withCurrentUser(Account));
