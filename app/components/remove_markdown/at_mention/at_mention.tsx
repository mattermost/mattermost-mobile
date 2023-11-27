// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect} from 'react';
import {type StyleProp, Text, type TextStyle} from 'react-native';

import {fetchUserOrGroupsByMentionsInBatch} from '@actions/remote/user';
import {useServerUrl} from '@context/server';
import GroupModel from '@database/models/server/group';
import {useMemoMentionedGroup, useMemoMentionedUser} from '@hooks/markdown';
import {displayUsername} from '@utils/user';

import type {Database} from '@nozbe/watermelondb';
import type UserModelType from '@typings/database/models/servers/user';

type AtMentionProps = {
    database: Database;
    mentionName: string;
    teammateNameDisplay: string;
    textStyle?: StyleProp<TextStyle>;
    users: UserModelType[];
    groups: GroupModel[];
}

const AtMention = ({
    mentionName,
    teammateNameDisplay,
    textStyle,
    users,
    groups,
}: AtMentionProps) => {
    const serverUrl = useServerUrl();

    const user = useMemoMentionedUser(users, mentionName);
    const group = useMemoMentionedGroup(groups, user, mentionName);

    // Effects
    useEffect(() => {
        // Fetches and updates the local db store with the mention
        if (!user?.username && !group?.name) {
            fetchUserOrGroupsByMentionsInBatch(serverUrl, mentionName);
        }
    }, []);

    let mention;

    if (user?.username) {
        mention = displayUsername(user, user.locale, teammateNameDisplay);
    } else if (group?.name) {
        mention = group.name;
    } else {
        const pattern = new RegExp(/\b(all|channel|here)(?:\.\B|_\b|\b)/, 'i');
        const mentionMatch = pattern.exec(mentionName);

        if (mentionMatch) {
            mention = mentionMatch.length > 1 ? mentionMatch[1] : mentionMatch[0];
        } else {
            mention = mentionName;
        }
    }

    return (
        <Text style={textStyle}>
            {'@' + mention}
        </Text>
    );
};

export default AtMention;
