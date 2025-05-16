// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {defineMessage} from 'react-intl';

import Tag, {BotTag, GuestTag} from '@components/tag';

type HeaderTagProps = {
    isAutomation?: boolean;
    isAutoResponder?: boolean;
    showGuestTag?: boolean;
}

const autoResponderMessage = defineMessage({id: 'post_info.auto_responder', defaultMessage: 'Automatic Reply'});

const HeaderTag = ({
    isAutomation, isAutoResponder, showGuestTag,
}: HeaderTagProps) => {
    if (isAutomation) {
        return (
            <BotTag testID='post_header.bot.tag'/>
        );
    } else if (showGuestTag) {
        return (
            <GuestTag testID='post_header.guest.tag'/>
        );
    } else if (isAutoResponder) {
        return (
            <Tag
                message={autoResponderMessage}
                testID='post_header.auto_responder.tag'
                uppercase={true}
            />
        );
    }

    return null;
};

export default HeaderTag;
