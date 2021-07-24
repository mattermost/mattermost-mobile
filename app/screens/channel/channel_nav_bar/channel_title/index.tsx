// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import React from 'react';
import {TouchableOpacity, View} from 'react-native';

import ChannelIcon from '@components/channel_icon';
import CompassIcon from '@components/compass_icon';
import {General} from '@constants';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {getUserIdFromChannelName, isGuest as isTeammateGuest} from '@utils/user';

import ChannelDisplayName from './channel_display_name';
import ChannelGuestLabel from './channel_guest_label';

import type {WithDatabaseArgs} from '@typings/database/database';
import type ChannelInfoModel from '@typings/database/models/servers/channel_info';
import type ChannelModel from '@typings/database/models/servers/channel';
import type MyChannelSettingsModel from '@typings/database/models/servers/my_channel_settings';
import type UserModel from '@typings/database/models/servers/user';
import type SystemModel from '@typings/database/models/servers/system';

type WithChannelArgs = WithDatabaseArgs & {
    currentUserId: SystemModel;
    channel: ChannelModel;
}

type ChannelTitleInputProps = {
    canHaveSubtitle: boolean;
    channel: ChannelModel;
    currentUserId: string;
    onPress: () => void;
};

type ChannelTitleProps = ChannelTitleInputProps & {
    channelInfo: ChannelInfoModel;
    channelSettings: MyChannelSettingsModel;
    teammate?: UserModel;
};

const ChannelTitle = ({
    canHaveSubtitle,
    channel,
    channelInfo,
    channelSettings,
    currentUserId,
    onPress,
    teammate,
}: ChannelTitleProps) => {
    const theme = useTheme();

    const style = getStyle(theme);
    const channelType = channel.type;
    const isArchived = channel.deleteAt !== 0;
    const isChannelMuted = channelSettings.notifyProps?.mark_unread === 'mention';
    const isChannelShared = false; // todo: Read this value from ChannelModel when implemented
    const hasGuests = channelInfo.guestCount > 0;
    const teammateRoles = teammate?.roles ?? '';
    const isGuest = channelType === General.DM_CHANNEL && isTeammateGuest(teammateRoles);

    const showGuestLabel = (canHaveSubtitle && ((isGuest && hasGuests) || (channelType === General.DM_CHANNEL && isGuest)));

    return (
        <TouchableOpacity
            testID={'channel.title.button'}
            style={style.container}
            onPress={onPress}
        >
            <View style={style.wrapper}>
                {isArchived && (
                    <CompassIcon
                        name='archive-outline'
                        style={[style.archiveIcon]}
                    />
                )}
                <ChannelDisplayName
                    channelType={channelType}
                    currentUserId={currentUserId}
                    displayName={channel.displayName}
                    teammateId={teammate?.id}
                    theme={theme}
                />
                {isChannelShared && (
                    <ChannelIcon
                        isActive={true}
                        isArchived={false}
                        size={18}
                        shared={isChannelShared}
                        style={style.channelIconContainer}
                        type={channelType}
                    />
                )}
                <CompassIcon
                    style={style.icon}
                    size={24}
                    name='chevron-down'
                />
                {isChannelMuted && (
                    <CompassIcon
                        style={[style.icon, style.muted]}
                        size={24}
                        name='bell-off-outline'
                    />
                )}
            </View>
            {showGuestLabel && (
                <ChannelGuestLabel
                    channelType={channelType}
                    theme={theme}
                />
            )}
        </TouchableOpacity>
    );
};

const getStyle = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
        },
        wrapper: {
            alignItems: 'center',
            flex: 1,
            position: 'relative',
            top: -1,
            flexDirection: 'row',
            justifyContent: 'flex-start',
            width: '90%',
        },
        icon: {
            color: theme.sidebarHeaderTextColor,
            marginHorizontal: 1,
        },
        emoji: {
            marginHorizontal: 5,
        },
        text: {
            color: theme.sidebarHeaderTextColor,
            fontSize: 18,
            fontWeight: 'bold',
            textAlign: 'center',
            flex: 0,
            flexShrink: 1,
        },
        channelIconContainer: {
            marginLeft: 3,
            marginRight: 0,
        },
        muted: {
            marginTop: 1,
            opacity: 0.6,
            marginLeft: 0,
        },
        archiveIcon: {
            fontSize: 17,
            color: theme.sidebarHeaderTextColor,
            paddingRight: 7,
        },
        guestsWrapper: {
            alignItems: 'flex-start',
            flex: 1,
            position: 'relative',
            top: -1,
            width: '90%',
        },
        guestsText: {
            color: theme.sidebarHeaderTextColor,
            fontSize: 14,
            opacity: 0.6,
        },
    };
});

const withSystemIds = withObservables([], ({database}: WithDatabaseArgs) => ({
    currentUserId: database.collections.get(MM_TABLES.SERVER.SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_USER_ID),
}));

const enhancedChannelTitle = withObservables(['channel', 'currentUserId'], ({channel, currentUserId, database}: WithChannelArgs) => {
    let teammateId;
    if (channel.type === General.DM_CHANNEL && channel.displayName) {
        teammateId = getUserIdFromChannelName(currentUserId.value, channel.name);
    }

    return {
        channelInfo: channel.info.observe(),
        channelSettings: channel.settings.observe(),
        ...(teammateId && {teammate: database.collections.get(MM_TABLES.SERVER.USER).findAndObserve(teammateId)}),
    };
});

export default withDatabase(withSystemIds(enhancedChannelTitle(ChannelTitle)));
