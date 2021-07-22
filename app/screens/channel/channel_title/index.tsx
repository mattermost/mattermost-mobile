// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import ChannelGuestLabel from '@screens/channel/channel_title/channel_guest_label';
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

const ConnectedChannelTitle = ({
    canHaveSubtitle,
    channel,
    channelInfo,
    channelSettings,
    currentUserId,
    onPress,
    teammate,
    teammateId,
}: ChannelTitleProps) => {
    const theme = useTheme();

    const style = getStyle(theme);
    const channelType = channel.type;
    const displayName = channel.displayName;
    const isArchived = channel.deleteAt !== 0;
    const isChannelMuted = channelSettings.notifyProps?.mark_unread === 'mention';
    const isChannelShared = false; // todo: Read this value from ChannelModel when implemented

    let isSelfDMChannel = false;
    if (channel.type === General.DM_CHANNEL && teammate) {
        isSelfDMChannel = currentUserId === teammateId;
    }

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
                <Text
                    ellipsizeMode='tail'
                    numberOfLines={1}
                    style={style.text}
                    testID='channel.nav_bar.title'
                >
                    {renderChannelDisplayName()}
                </Text>
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
            <ChannelGuestLabel
                canHaveSubtitle={canHaveSubtitle}
                channelType={channelType}
                guestCount={channelInfo.guestCount}
                teammateRoles={teammate?.roles ?? ''}
                theme={theme}
            />
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

const ChannelTitle: React.FunctionComponent<ChannelTitleInputProps> =
    withDatabase(
        withObservables(
            ['channel', 'teammateId'],
            ({
                channel,
                teammateId,
                database,
            }: {
                channel: ChannelModel;
                teammateId: string;
                database: Database;
            }) => {
                return {
                    channelInfo: database.collections.
                        get(MM_TABLES.SERVER.CHANNEL_INFO).
                        findAndObserve(channel.id),
                    channelSettings: database.collections.
                        get(MM_TABLES.SERVER.MY_CHANNEL_SETTINGS).
                        findAndObserve(channel.id),
                    ...(teammateId &&
                        channel.displayName && {
                        teammate: database.collections.
                            get(MM_TABLES.SERVER.USER).
                            findAndObserve(teammateId),
                    }),
                };
            },
        )(ConnectedChannelTitle),
    );

export default ChannelTitle;
