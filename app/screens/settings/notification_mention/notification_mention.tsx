// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import SettingContainer from '../setting_container';

import MentionSettings from './mention_settings';

import type UserModel from '@typings/database/models/servers/user';

type NotificationMentionProps = {
    componentId: string;
    currentUser: UserModel;
    isCRTEnabled: boolean;
}
const NotificationMention = ({componentId, currentUser, isCRTEnabled}: NotificationMentionProps) => {
    return (
        <SettingContainer testID='mention_notification_settings'>
            <MentionSettings
                currentUser={currentUser}
                componentId={componentId}
                isCRTEnabled={isCRTEnabled}
            />
        </SettingContainer>
    );
};

export default NotificationMention;

