// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet} from 'react-native';

import Tag, {BotTag, GuestTag} from '@components/tag';

type Props = {
    isBot: boolean;
    isChannelAdmin: boolean;
    showGuestTag: boolean;
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

const UserProfileTag = ({isBot, isChannelAdmin, showGuestTag, isSystemAdmin, isTeamAdmin}: Props) => {
    if (isBot) {
        return (
            <BotTag
                style={styles.tag}
                testID='user_profile.bot.tag'
            />);
    }

    if (showGuestTag) {
        return (
            <GuestTag
                style={styles.tag}
                testID='user_profile.guest.tag'
            />);
    }

    if (isSystemAdmin) {
        return (
            <Tag
                id='user_profile.system_admin'
                defaultMessage='System Admin'
                style={styles.tag}
                testID='user_profile.system_admin.tag'
            />
        );
    }

    if (isTeamAdmin) {
        return (
            <Tag
                id='user_profile.team_admin'
                defaultMessage='Team Admin'
                style={styles.tag}
                testID='user_profile.team_admin.tag'
            />
        );
    }

    if (isChannelAdmin) {
        return (
            <Tag
                id='user_profile.channel_admin'
                defaultMessage='Channel Admin'
                style={styles.tag}
                testID='user_profile.channel_admin.tag'
            />
        );
    }

    return null;
};

export default UserProfileTag;
