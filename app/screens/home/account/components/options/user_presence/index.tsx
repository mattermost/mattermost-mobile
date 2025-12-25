// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {TouchableOpacity, View} from 'react-native';

import StatusLabel from '@components/status_label';
import UserStatusIndicator from '@components/user_status';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import {usePreventDoubleTap} from '@hooks/utils';
import {navigateToScreen} from '@utils/navigation/adapter';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type UserModel from '@typings/database/models/servers/user';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        label: {
            color: theme.centerChannelColor,
            ...typography('Body', 200),
            textAlignVertical: 'center',
            includeFontPadding: false,
        },
        body: {
            flexDirection: 'row',
            marginTop: 18,
        },
        spacer: {
            marginLeft: 16,
        },
    };
});

type Props = {
    currentUser: UserModel;
};
const UserStatus = ({currentUser}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const handleSetStatus = usePreventDoubleTap(useCallback(() => {
        navigateToScreen(Screens.USER_STATUS);
    }, []));

    return (
        <TouchableOpacity
            onPress={handleSetStatus}
            testID='account.user_presence.option'
        >
            <View style={styles.body}>
                <UserStatusIndicator
                    size={24}
                    status={currentUser.status}
                />
                <StatusLabel
                    labelStyle={[styles.label, styles.spacer]}
                    status={currentUser.status}
                />
            </View>
        </TouchableOpacity>
    );
};

export default UserStatus;
