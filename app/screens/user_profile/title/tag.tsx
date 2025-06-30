// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {defineMessages} from 'react-intl';

import Tag, {BotTag, GuestTag} from '@components/tag';

type Props = {
    isBot: boolean;
    isChannelAdmin: boolean;
    showGuestTag: boolean;
    isSystemAdmin: boolean;
    isTeamAdmin: boolean;
}

const messages = defineMessages({
    sysAdmin: {
        id: 'user_profile.system_admin',
        defaultMessage: 'System Admin',
    },
    teamAdmin: {
        id: 'user_profile.team_admin',
        defaultMessage: 'Team Admin',
    },
    channelAdmin: {
        id: 'user_profile.channel_admin',
        defaultMessage: 'Channel Admin',
    },
});

const UserProfileTag = ({isBot, isChannelAdmin, showGuestTag, isSystemAdmin, isTeamAdmin}: Props) => {
    if (isBot) {
        return (
            <BotTag testID='user_profile.bot.tag'/>);
    }

    if (showGuestTag) {
        return (
            <GuestTag testID='user_profile.guest.tag'/>);
    }

    if (isSystemAdmin) {
        return (
            <Tag
                message={messages.sysAdmin}
                uppercase={true}
                testID='user_profile.system_admin.tag'
            />
        );
    }

    if (isTeamAdmin) {
        return (
            <Tag
                message={messages.teamAdmin}
                testID='user_profile.team_admin.tag'
                uppercase={true}
            />
        );
    }

    if (isChannelAdmin) {
        return (
            <Tag
                message={messages.channelAdmin}
                testID='user_profile.channel_admin.tag'
                uppercase={true}
            />
        );
    }

    return null;
};

export default UserProfileTag;
