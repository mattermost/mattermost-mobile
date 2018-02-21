// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

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
        mention_keys: user ? `${user.username},@${user.username}` : '',
        push: 'mention',
        push_status: 'online',
    };

    if (!user || !user.first_name) {
        props.first_name = 'false';
    } else {
        props.first_name = 'true';
    }

    return props;
}

