// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {Text, View} from 'react-native';

import {fetchChannelCreator} from '@actions/remote/channel';
import FormattedText from '@components/formatted_text';
import {General} from '@constants';
import {useServerUrl} from '@context/server_url';
import {t} from '@i18n';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type ChannelModel from '@typings/database/models/servers/channel';

type Props = {
    channel: ChannelModel;
    creator?: string;
    theme: Theme;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    message: {
        color: changeOpacity(theme.centerChannelColor, 0.8),
        ...typography('Body', 100, 'Regular'),
    },
    title: {
        color: theme.centerChannelColor,
        marginBottom: 12,
        ...typography('Heading', 400, 'SemiBold'),
    },
}));

const PublicOrPrivateChannel = ({channel, creator, theme}: Props) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const styles = getStyleSheet(theme);

    useEffect(() => {
        if (!creator && channel.creatorId) {
            fetchChannelCreator(serverUrl, channel.id);
        }
    }, []);

    const message = useMemo(() => {
        const date = intl.formatDate(channel.createAt, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });

        let mainMessageIntl;
        if (creator) {
            const id = channel.type === General.OPEN_CHANNEL ? t('intro_messages.creator') : t('intro_messages.creatorPrivate');
            const defaultMessage = channel.type === General.OPEN_CHANNEL ? 'This is the start of the {name} channel, created by {creator} on {date}.' : 'This is the start of the {name} private channel, created by {creator} on {date}.';
            mainMessageIntl = {
                id,
                defaultMessage,
                values: {
                    name: channel.displayName,
                    creator,
                    date,
                },
            };
        } else {
            mainMessageIntl = {
                id: t('intro_messages.noCreator'),
                defaultMessage: 'This is the start of the {name} channel, created on {date}.',
                values: {
                    name: channel.displayName,
                    date,
                },
            };
        }

        const mainMessage = intl.formatMessage({
            id: mainMessageIntl.id,
            defaultMessage: mainMessageIntl.defaultMessage,
        }, mainMessageIntl.values);

        let suffix;
        if (channel.type === General.OPEN_CHANNEL) {
            suffix = intl.formatMessage({
                id: 'intro_messages.anyMember',
                defaultMessage: ' Any member can join and read this channel.',
            });
        } else {
            suffix = intl.formatMessage({
                id: 'intro_messages.onlyInvited',
                defaultMessage: ' Only invited members can see this private channel.',
            });
        }

        return `${mainMessage} ${suffix}`;
    }, [channel.displayName, channel.type, creator, theme]);

    return (
        <View>
            <FormattedText
                defaultMessage='Beginning of {name}'
                id='intro_messages.beginning'
                style={styles.title}
                values={{name: channel.displayName}}
            />
            <Text style={styles.message}>
                {message}
            </Text>
        </View>
    );
};

export default PublicOrPrivateChannel;
