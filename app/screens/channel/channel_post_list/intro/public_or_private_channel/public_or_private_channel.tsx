// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {Text, View} from 'react-native';

import {fetchChannelCreator} from '@actions/remote/channel';
import CompassIcon from '@components/compass_icon';
import {General, Permissions} from '@constants';
import {useServerUrl} from '@context/server';
import {t} from '@i18n';
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
        const id = channel.type === General.OPEN_CHANNEL ? t('intro.public_channel') : t('intro.private_channel');
        const defaultMessage = channel.type === General.OPEN_CHANNEL ? 'Public Channel' : 'Private Channel';
        const channelType = `${intl.formatMessage({id, defaultMessage})} `;

        const date = intl.formatDate(channel.createAt, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
        const by = intl.formatMessage({id: 'intro.created_by', defaultMessage: 'created by {creator} on {date}.'}, {
            creator,
            date,
        });

        return `${channelType} ${by}`;
    }, [channel.type, creator, theme]);

    const message = useMemo(() => {
        const id = channel.type === General.OPEN_CHANNEL ? t('intro.welcome.public') : t('intro.welcome.private');
        const msg = channel.type === General.OPEN_CHANNEL ? 'Add some more team members to the channel or start a conversation below.' : 'Only invited members can see messages posted in this private channel.';
        const mainMessage = intl.formatMessage({
            id: 'intro.welcome',
            defaultMessage: 'Welcome to {displayName} channel.',
        }, {displayName: channel.displayName});

        const suffix = intl.formatMessage({id, defaultMessage: msg});

        return `${mainMessage} ${suffix}`;
    }, [channel.displayName, channel.type, theme]);

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
