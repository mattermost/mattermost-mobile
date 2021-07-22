// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import React from 'react';
import {Text, TouchableOpacity, View} from 'react-native';

import ChannelIcon from '@components/channel_icon';
import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import {General} from '@constants';
import {MM_TABLES} from '@constants/database';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {t} from '@utils/i18n';

import type {Database} from '@nozbe/watermelondb';

import type ChannelInfoModel from '@typings/database/models/servers/channel_info';
import type ChannelModel from '@typings/database/models/servers/channel';
import type MyChannelSettingsModel from '@typings/database/models/servers/my_channel_settings';
import type UserModel from '@typings/database/models/servers/user';

const ConnectedChannelTitle = ({channel, onPress, canHaveSubtitle, currentUserId, channelInfo, channelSettings, teammateId, teammate}: ChannelTitleProps) => {
    const theme = useTheme();

    const style = getStyle(theme);
    const channelType = channel.type;
    const displayName = channel ? channel.displayName : '';
    const hasGuests = channelInfo.guestCount > 0;
    const isArchived = channel.deleteAt !== 0;
    const isChannelMuted = channelSettings.notifyProps?.mark_unread === 'mention';
    const isChannelShared = false; // todo: Read this value from ChannelModel when implemented

    let isGuest = false;
    let isSelfDMChannel = false;
    let wrapperWidth = 90;

    if (channel.type === General.DM_CHANNEL && teammate) {
        isGuest = teammate.roles === General.SYSTEM_GUEST_ROLE;
        isSelfDMChannel = currentUserId === teammateId;
    }

    const renderArchiveIcon = () => {
        let content = null;
        if (isArchived) {
            content = (
                <CompassIcon
                    name='archive-outline'
                    style={[style.archiveIcon]}
                />
            );
        }
        return content;
    };

    const renderHasGuestsText = () => {
        if (!canHaveSubtitle) {
            return null;
        }
        if (!isGuest && !hasGuests) {
            return null;
        }
        if (channelType === General.DM_CHANNEL && !isGuest) {
            return null;
        }

        let messageId;
        let defaultMessage;
        if (channelType === General.DM_CHANNEL) {
            messageId = t('channel.isGuest');
            defaultMessage = 'This person is a guest';
        } else if (channelType === General.GM_CHANNEL) {
            messageId = t('channel.hasGuests');
            defaultMessage = 'This group message has guests';
        } else if (channelType === General.OPEN_CHANNEL || channelType === General.PRIVATE_CHANNEL) {
            messageId = t('channel.channelHasGuests');
            defaultMessage = 'This channel has guests';
        } else {
            return null;
        }

        return (
            <View style={style.guestsWrapper}>
                <FormattedText
                    numberOfLines={1}
                    ellipsizeMode='tail'
                    id={messageId}
                    defaultMessage={defaultMessage}
                    style={style.guestsText}
                />
            </View>
        );
    };

    const renderChannelIcon = () => {
        if (isChannelShared) {
            return (
                <ChannelIcon
                    isActive={true}
                    isArchived={false}

                    // isBot={false}
                    size={18}
                    shared={isChannelShared}
                    style={style.channelIconContainer}
                    type={channelType}
                />
            );
        }
        return null;
    };

    const renderChannelDisplayName = () => {
        if (isSelfDMChannel) {
            const messageId = t('channel_header.directchannel.you');
            const defaultMessage = '{displayname} (you)';
            const values = {displayname: displayName};

            return (
                <FormattedText
                    id={messageId}
                    defaultMessage={defaultMessage}
                    values={values}
                />
            );
        }

        return displayName;
    };

    const renderMutedIcon = () => {
        if (isChannelMuted) {
            wrapperWidth -= 10;
            return (
                <CompassIcon
                    style={[style.icon, style.muted]}
                    size={24}
                    name='bell-off-outline'
                />
            );
        }
        return null;
    };

    const renderIcon = () => {
        return (
            <CompassIcon
                style={style.icon}
                size={24}
                name='chevron-down'
            />
        );
    };

    return (
        <TouchableOpacity
            testID={'channel.title.button'}
            style={style.container}
            onPress={onPress}
        >
            <View style={[style.wrapper, {width: `${wrapperWidth}%`}]}>
                {renderArchiveIcon()}
                <Text
                    ellipsizeMode='tail'
                    numberOfLines={1}
                    style={style.text}
                    testID='channel.nav_bar.title'
                >
                    {renderChannelDisplayName()}
                </Text>
                {renderChannelIcon()}
                {renderIcon()}
                {renderMutedIcon()}
            </View>
            {renderHasGuestsText()}
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

type ChannelTitleInputProps = {
    canHaveSubtitle: boolean;
    channel: ChannelModel;
    currentUserId: string;
    teammateId?: string;
    onPress: () => void;
};

type ChannelTitleProps = ChannelTitleInputProps & {
    channelInfo: ChannelInfoModel;
    channelSettings: MyChannelSettingsModel;
    database: Database;
    teammate?: UserModel;
    teammateId: string;
};

const ChannelTitle: React.FunctionComponent<ChannelTitleInputProps> = withDatabase(
    withObservables(['channel', 'teammateId'], ({channel, teammateId, database}: { channel: ChannelModel; teammateId: string; database: Database }) => {
        return {
            channelInfo: database.collections.get(MM_TABLES.SERVER.CHANNEL_INFO).findAndObserve(channel.id),
            channelSettings: database.collections.get(MM_TABLES.SERVER.MY_CHANNEL_SETTINGS).findAndObserve(channel.id),
            ...(teammateId && channel.displayName && {teammate: database.collections.get(MM_TABLES.SERVER.USER).findAndObserve(teammateId)}),
        };
    },
    )(ConnectedChannelTitle),
);

export default ChannelTitle;
