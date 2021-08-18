// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export function getNotificationProps(user) {
    if (user && user.notify_props) {
        return user.notify_props;
    }

    const props = {
        channel: 'true',
        comments: 'any',
        desktop: 'all',
        desktop_sound: 'true',
        email: 'true',
        email_threads: 'all',
        mention_keys: user ? `${user.username},@${user.username}` : '',
        push: 'mention',
        push_status: 'online',
        push_threads: 'all',
    };

    if (!user || !user.first_name) {
        props.first_name = 'false';
    } else {
        props.first_name = 'true';
    }

    return props;
}

