// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet} from 'react-native';

import Tag, {BotTag, GuestTag} from '@components/tag';

type Props = {
    isBot: boolean;
    isChannelAdmin: boolean;
    isGuest: boolean;
    isSystemAdmin: boolean;
    isTeamAdmin: boolean;
}

const styles = StyleSheet.create({
    tag: {
        alignSelf: 'flex-start',
        paddingHorizontal: 6,
        marginBottom: 4,
    },
});

const UserProfileTag = ({isBot, isChannelAdmin, isGuest, isSystemAdmin, isTeamAdmin}: Props) => {
    if (isBot) {
        return (<BotTag style={styles.tag}/>);
    }

    if (isGuest) {
        return (<GuestTag style={styles.tag}/>);
    }

    if (isSystemAdmin) {
        return (
            <Tag
                id='user_profile.system_admin'
                defaultMessage='System Admin'
                style={styles.tag}
            />
        );
    }

    if (isTeamAdmin) {
        return (
            <Tag
                id='user_profile.team_admin'
                defaultMessage='Team Admin'
                style={styles.tag}
            />
        );
    }

    if (isChannelAdmin) {
        return (
            <Tag
                id='user_profile.channel_admin'
                defaultMessage='Channel Admin'
                style={styles.tag}
            />
        );
    }

    return null;
};

export default UserProfileTag;
