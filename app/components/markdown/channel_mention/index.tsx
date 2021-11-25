// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {StyleProp, Text, TextStyle} from 'react-native';
import {map, switchMap} from 'rxjs/operators';

import {switchToChannel} from '@actions/local/channel';
import {joinChannel} from '@actions/remote/channel';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {useServerUrl} from '@context/server';
import {t} from '@i18n';
import {dismissAllModals, popToRoot} from '@screens/navigation';
import {alertErrorWithFallback} from '@utils/draft';
import {preventDoubleTap} from '@utils/tap';

import type {WithDatabaseArgs} from '@typings/database/database';
import type ChannelModel from '@typings/database/models/servers/channel';
import type SystemModel from '@typings/database/models/servers/system';
import type TeamModel from '@typings/database/models/servers/team';

export type ChannelMentions = Record<string, {id?: string; display_name: string; name?: string; team_name: string}>;

type ChannelMentionProps = {
    channelMentions?: ChannelMentions;
    channelName: string;
    channels: ChannelModel[];
    currentTeamId: string;
    currentUserId: string;
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
        if (channelsByName[channelName]) {
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

const {SERVER: {CHANNEL, SYSTEM, TEAM}} = MM_TABLES;

const ChannelMention = ({
    channelMentions, channelName, channels, currentTeamId, currentUserId,
    linkStyle, team, textStyle,
}: ChannelMentionProps) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const channel = getChannelFromChannelName(channelName, channels, channelMentions, team.name);

    const handlePress = useCallback(preventDoubleTap(async () => {
        let c = channel;

        if (!c?.id && c?.display_name) {
            const result = await joinChannel(serverUrl, currentUserId, currentTeamId, undefined, channelName);
            if (result.error || !result.channel) {
                const joinFailedMessage = {
                    id: t('mobile.join_channel.error'),
                    defaultMessage: "We couldn't join the channel {displayName}. Please check your connection and try again.",
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
            switchToChannel(serverUrl, c.id);
            await dismissAllModals();
            await popToRoot();
        }
    }), [channel?.display_name, channel?.id]);

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

const withChannelsForTeam = withObservables([], ({database}: WithDatabaseArgs) => {
    const currentTeamId = database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID);
    const currentUserId = database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_USER_ID);
    const channels = currentTeamId.pipe(
        switchMap(({value}) => database.get<ChannelModel>(CHANNEL).query(Q.where('team_id', value)).observeWithColumns(['display_name'])),
    );
    const team = currentTeamId.pipe(
        switchMap(({value}) => database.get<TeamModel>(TEAM).findAndObserve(value)),
    );

    return {
        channels,
        currentTeamId: currentTeamId.pipe(map((ct) => ct.value)),
        currentUserId: currentUserId.pipe(map((cu) => cu.value)),
        team,
    };
});

export default withDatabase(withChannelsForTeam(ChannelMention));
