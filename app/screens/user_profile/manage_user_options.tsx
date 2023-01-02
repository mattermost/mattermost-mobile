// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {View} from 'react-native';

import ManageMembersLabel from '@components/channel_actions/manage_members_label';
import {Members} from '@constants';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

export const DIVIDER_MARGIN = 8;
const {MAKE_CHANNEL_ADMIN, MAKE_CHANNEL_MEMBER, REMOVE_USER} = Members.MANAGE_OPTIONS;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        divider: {
            alignSelf: 'center',
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.16),
            height: 1,
            marginVertical: DIVIDER_MARGIN,
            paddingHorizontal: 20,
            width: '100%',
        },
    };
});

type Props = {
    channelId: string;
    isDefaultChannel: boolean;
    isChannelAdmin: boolean;
    userId: string;
}

const ManageUserOptions = ({channelId, isChannelAdmin, isDefaultChannel, userId}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const manageOption = isChannelAdmin ? MAKE_CHANNEL_MEMBER : MAKE_CHANNEL_ADMIN;

    return (
        <>
            <View style={styles.divider}/>
            <ManageMembersLabel
                channelId={channelId}
                isDefaultChannel={isDefaultChannel}
                manageOption={manageOption}
                testID='channel.make_channel_admin'
                userId={userId}
            />
            <ManageMembersLabel
                channelId={channelId}
                isDefaultChannel={isDefaultChannel}
                manageOption={REMOVE_USER}
                testID='channel.remove_member'
                userId={userId}
            />
        </>
    );
};

export default ManageUserOptions;
