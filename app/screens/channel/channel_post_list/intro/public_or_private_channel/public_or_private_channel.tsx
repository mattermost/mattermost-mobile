// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useMemo} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Text, View} from 'react-native';

import {fetchChannelCreator} from '@actions/remote/channel';
import CompassIcon from '@components/compass_icon';
import {General, Permissions} from '@constants';
import {useServerUrl} from '@context/server';
import {hasPermission} from '@utils/role';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import PrivateChannel from '../illustration/private';
import PublicChannel from '../illustration/public';
import IntroOptions from '../options';

import type ChannelModel from '@typings/database/models/servers/channel';
import type RoleModel from '@typings/database/models/servers/role';

type Props = {
    channel: ChannelModel;
    creator?: string;
    roles: RoleModel[];
    theme: Theme;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        alignItems: 'center',
        marginHorizontal: 20,
    },
    created: {
        color: changeOpacity(theme.centerChannelColor, 0.64),
        ...typography('Body', 50, 'Regular'),
    },
    icon: {
        marginRight: 5,
    },
    message: {
        color: theme.centerChannelColor,
        marginTop: 16,
        textAlign: 'center',
        ...typography('Body', 200, 'Regular'),
    },
    title: {
        color: theme.centerChannelColor,
        marginTop: 8,
        marginBottom: 8,
        textAlign: 'center',
        ...typography('Heading', 700, 'SemiBold'),
    },
}));

const messages = defineMessages({
    publicChannel: {
        id: 'intro.public_channel',
        defaultMessage: 'Public Channel',
    },
    privateChannel: {
        id: 'intro.private_channel',
        defaultMessage: 'Private Channel',
    },
    welcomePublic: {
        id: 'intro.welcome.public',
        defaultMessage: 'Add some more team members to the channel or start a conversation below.',
    },
    welcomePrivate: {
        id: 'intro.welcome.private',
        defaultMessage: 'Only invited members can see messages posted in this private channel.',
    },
    welcome: {
        id: 'intro.welcome',
        defaultMessage: 'Welcome to {displayName} channel.',
    },
    createdBy: {
        id: 'intro.created_by',
        defaultMessage: 'created by {creator} on {date}.',
    },
});

const PublicOrPrivateChannel = ({channel, creator, roles, theme}: Props) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const styles = getStyleSheet(theme);
    const illustration = useMemo(() => {
        if (channel.type === General.OPEN_CHANNEL) {
            return <PublicChannel theme={theme}/>;
        }

        return <PrivateChannel theme={theme}/>;
    }, [channel.type, theme]);

    useEffect(() => {
        if (!creator && channel.creatorId) {
            fetchChannelCreator(serverUrl, channel.id);
        }
    }, []);

    const canManagePeople = useMemo(() => {
        if (channel.deleteAt !== 0) {
            return false;
        }
        const permission = channel.type === General.OPEN_CHANNEL ? Permissions.MANAGE_PUBLIC_CHANNEL_MEMBERS : Permissions.MANAGE_PRIVATE_CHANNEL_MEMBERS;
        return hasPermission(roles, permission);
    }, [channel.type, roles, channel.deleteAt]);

    const canSetHeader = useMemo(() => {
        if (channel.deleteAt !== 0) {
            return false;
        }
        const permission = channel.type === General.OPEN_CHANNEL ? Permissions.MANAGE_PUBLIC_CHANNEL_PROPERTIES : Permissions.MANAGE_PRIVATE_CHANNEL_PROPERTIES;
        return hasPermission(roles, permission);
    }, [channel.type, roles, channel.deleteAt]);

    const createdBy = useMemo(() => {
        const message = channel.type === General.OPEN_CHANNEL ? messages.publicChannel : messages.privateChannel;
        const channelType = `${intl.formatMessage(message)} `;

        const date = intl.formatDate(channel.createAt, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
        const by = intl.formatMessage(messages.createdBy, {
            creator,
            date,
        });

        return `${channelType} ${by}`;
    }, [channel.createAt, channel.type, creator, intl]);

    const message = useMemo(() => {
        const msg = channel.type === General.OPEN_CHANNEL ? messages.welcomePublic : messages.welcomePrivate;
        const mainMessage = intl.formatMessage(messages.welcome, {displayName: channel.displayName});

        const suffix = intl.formatMessage(msg);

        return `${mainMessage} ${suffix}`;
    }, [channel.displayName, channel.type, intl]);

    return (
        <View style={styles.container}>
            {illustration}
            <Text
                style={styles.title}
                testID='channel_post_list.intro.display_name'
            >
                {channel.displayName}
            </Text>
            <View style={{flexDirection: 'row'}}>
                <CompassIcon
                    name={channel.type === General.OPEN_CHANNEL ? 'globe' : 'lock'}
                    size={14.4}
                    color={changeOpacity(theme.centerChannelColor, 0.64)}
                    style={styles.icon}
                />
                <Text style={styles.created}>
                    {createdBy}
                </Text>
            </View>
            <Text style={styles.message}>
                {message}
            </Text>
            <IntroOptions
                channelId={channel.id}
                header={canSetHeader}
                canAddMembers={canManagePeople}
            />
        </View>
    );
};

export default PublicOrPrivateChannel;
