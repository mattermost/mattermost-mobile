// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {type StyleProp, Text, type TextStyle} from 'react-native';

import {joinChannel, switchToChannelById} from '@actions/remote/channel';
import {useServerUrl} from '@context/server';
import {t} from '@i18n';
import {alertErrorWithFallback} from '@utils/draft';
import {preventDoubleTap} from '@utils/tap';
import {secureGetFromRecord, isRecordOf} from '@utils/types';

import type ChannelModel from '@typings/database/models/servers/channel';
import type TeamModel from '@typings/database/models/servers/team';

export type ChannelMentions = Record<string, {id?: string; display_name: string; name?: string; team_name?: string}>;

export function isChannelMentions(v: unknown): v is ChannelMentions {
    return isRecordOf(v, (e) => {
        if (typeof e !== 'object' || !e) {
            return false;
        }

        if (!('display_name' in e) || typeof e.display_name !== 'string') {
            return false;
        }

        if ('team_name' in e && typeof e.team_name !== 'string') {
            return false;
        }

        if ('id' in e && typeof e.id !== 'string') {
            return false;
        }

        if ('name' in e && typeof e.name !== 'string') {
            return false;
        }

        return true;
    });
}

type ChannelMentionProps = {
    channelMentions?: ChannelMentions;
    channelName: string;
    channels: ChannelModel[];
    currentTeamId: string;
    linkStyle: StyleProp<TextStyle>;
    team: TeamModel;
    textStyle: StyleProp<TextStyle>;
}

function getChannelFromChannelName(name: string, channels: ChannelModel[], channelMentions: ChannelMentions = {}, teamName: string) {
    const channelsByName = channelMentions;
    let channelName = name;

    channels.forEach((c) => {
        channelsByName[c.name] = {
            id: c.id,
            display_name: c.displayName,
            name: c.name,
            team_name: teamName,
        };
    });

    while (channelName.length > 0) {
        if (secureGetFromRecord(channelsByName, channelName)) {
            return channelsByName[channelName];
        }

        // Repeatedly trim off trailing punctuation in case this is at the end of a sentence
        if ((/[_-]$/).test(channelName)) {
            channelName = channelName.substring(0, channelName.length - 1);
        } else {
            break;
        }
    }

    return null;
}

const ChannelMention = ({
    channelMentions, channelName, channels, currentTeamId,
    linkStyle, team, textStyle,
}: ChannelMentionProps) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const channel = getChannelFromChannelName(channelName, channels, channelMentions, team.name);

    const handlePress = preventDoubleTap(async () => {
        let c = channel;

        if (!c?.id && c?.display_name) {
            const result = await joinChannel(serverUrl, currentTeamId, undefined, channelName);
            if (result.error || !result.channel) {
                const joinFailedMessage = {
                    id: t('mobile.join_channel.error'),
                    defaultMessage: "We couldn't join the channel {displayName}.",
                };
                alertErrorWithFallback(intl, result.error || {}, joinFailedMessage, {displayName: c.display_name});
            } else if (result.channel) {
                c = {
                    ...c,
                    id: result.channel.id,
                    name: result.channel.name,
                };
            }
        }

        if (c?.id) {
            switchToChannelById(serverUrl, c.id);
        }
    });

    if (!channel) {
        return <Text style={textStyle}>{`~${channelName}`}</Text>;
    }

    let suffix;
    if (channel.name) {
        suffix = channelName.substring(channel.name.length);
    }

    return (
        <Text style={textStyle}>
            <Text
                onPress={handlePress}
                style={linkStyle}
            >
                {`~${channel.display_name}`}
            </Text>
            {suffix}
        </Text>
    );
};

export default ChannelMention;
