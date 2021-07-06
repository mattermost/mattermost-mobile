// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import React, {useEffect, useState} from 'react';
import {Text, TouchableOpacity, View} from 'react-native';

import ChannelIcon from '@components/channel_icon';
import CompassIcon from '@components/compass_icon';
import CustomStatusEmoji from '@components/custom_status/custom_status_emoji';

import FormattedText from '@components/formatted_text';
import General from '@constants/general';
import {isCustomStatusEnabled} from '@queries/helpers';
import {queryUserById} from '@queries/servers/user';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {t} from '@utils/i18n';
import {getUserIdFromChannelName} from '@utils/user';

import {useTheme} from '../../channel/theme_provider';

import type {Database} from '@nozbe/watermelondb';
import type ChannelInfoModel from '@typings/database/models/servers/channel_info';
import type ChannelModel from '@typings/database/models/servers/channel';
import type MyChannelSettingsModel from '@typings/database/models/servers/my_channel_settings';
import type SystemModel from '@typings/database/models/servers/system';
import type UserModel from '@typings/database/models/servers/user';

const ChannelTitle = ({config, channel, channelInfo, database, myChannelSettings, user, onPress, canHaveSubtitle}: ChannelTitleProps) => {
    const theme = useTheme();

    //fixme: rename customStatusEnabled
    const [customStatusEnabled, setCustomStatusEnabled] = useState<boolean>(false);
    const [isGuest, setIsGuest] = useState<boolean>(false);
    const [isSelfDMChannel, setIsSelfDMChannel] = useState<boolean>(false);
    const [teammateId, setTeammateId] = useState<string>('');

    useEffect(() => {
        const flag = isCustomStatusEnabled(config.value);
        setCustomStatusEnabled(flag);
    }, [config]);

    useEffect(() => {
        //fixme:  rename method name
        const setup = async () => {
            if (channel.type === General.DM_CHANNEL) {
                const teammate_id = getUserIdFromChannelName(user.id, channel.name);
                setTeammateId(teammate_id);

                const userRecords = await queryUserById({database, userId: teammateId}).fetch() as UserModel[];
                if (userRecords?.length) {
                    const teammate = userRecords[0];
                    setIsGuest(teammate.isGuest);
                    setIsSelfDMChannel(user.id === teammate_id);
                }
            }
        };
        setup();
    }, [channel, database, teammateId, user.id]);

    const style = getStyleSheet(theme);

    const channelType = channel.type;
    const isChannelMuted = myChannelSettings?.[0].notifyProps?.mark_unread === 'mention';
    const isChannelShared = false; //fixme:  we'll need to add this column
    const hasGuests = channelInfo?.[0].guestCount > 0;
    const isArchived = channel.deleteAt !== 0;

    const archiveIcon = () => {
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
        } else if (
            channelType === General.OPEN_CHANNEL ||
            channelType === General.PRIVATE_CHANNEL
        ) {
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

    const renderChannelDisplayName = () => {
        const channelDisplayName = channel.displayName;

        if (isSelfDMChannel) {
            const messageId = t('channel_header.directchannel.you');
            const defaultMessage = '{displayname} (you)';
            const values = {displayname: channelDisplayName};

            return (
                <FormattedText
                    id={messageId}
                    defaultMessage={defaultMessage}
                    values={values}
                />
            );
        }

        return channelDisplayName;
    };

    const hasGuestsText = renderHasGuestsText(); // ??????
    const channelDisplayName = renderChannelDisplayName();

    let icon;
    if (channelDisplayName) {
        icon = (
            <CompassIcon
                style={style.icon}
                size={24}
                name='chevron-down'
            />
        );
    }

    let mutedIcon;
    let wrapperWidth = 90;
    if (isChannelMuted) {
        mutedIcon = (
            <CompassIcon
                style={[style.icon, style.muted]}
                size={24}
                name='bell-off-outline'
            />
        );
        wrapperWidth -= 10;
    }

    const customStatus =
        channelType === General.DM_CHANNEL && customStatusEnabled ? (
            <CustomStatusEmoji
                userID={teammateId}
                emojiSize={16}
                style={[style.icon, style.emoji]}
            />
        ) : null;

    if (customStatus) {
        wrapperWidth -= 10;
    }

    let channelIcon;
    if (isChannelShared) {
        channelIcon = (
            <ChannelIcon
                isActive={true}
                isArchived={false}
                isBot={false}
                size={18}
                shared={isChannelShared}
                style={style.channelIconContainer}
                theme={theme}
                type={channelType}
            />
        );
    }

    return (
        <TouchableOpacity
            testID={'channel.title.button'}
            style={style.container}
            onPress={onPress}
        >
            <View style={[style.wrapper, {width: `${wrapperWidth}%`}]}>
                {archiveIcon()}
                <Text
                    ellipsizeMode='tail'
                    numberOfLines={1}
                    style={style.text}
                    testID='channel.nav_bar.title'
                >
                    {channelDisplayName}
                </Text>
                {channelIcon}
                {icon}
                {customStatus}
                {mutedIcon}
            </View>
            {hasGuestsText}
        </TouchableOpacity>
    );
};

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
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

type WithChannelArgs = {
    channel : ChannelModel
}

type ChannelTitleProps = WithChannelArgs & {
    canHaveSubtitle: boolean;
    channelInfo: ChannelInfoModel[];
    config: SystemModel;
    database: Database;
    myChannelSettings: MyChannelSettingsModel[];
    onPress: () => void;
    user: UserModel;
};

const enhanceWithChannelInfo = withObservables(['channel'], ({channel}: WithChannelArgs) => ({
    channelInfo: channel.info,
    myChannelSettings: channel.settings,
}));

export default withDatabase(enhanceWithChannelInfo(ChannelTitle));
