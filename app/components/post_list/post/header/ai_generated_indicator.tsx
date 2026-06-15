// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import {changeOpacity} from '@utils/theme';
import {ensureString} from '@utils/types';

import type PostModel from '@typings/database/models/servers/post';

type Props = {
    post: PostModel;
}

const messages = defineMessages({
    self: {
        id: 'post_info.ai_generated.self',
        defaultMessage: 'AI-generated',
    },
    byUser: {
        id: 'post_info.ai_generated.by_user',
        defaultMessage: 'Message posted by @{username}',
    },
});

function AiGeneratedIndicator({post}: Props) {
    const theme = useTheme();
    const intl = useIntl();

    const userId = ensureString(post.props?.ai_generated_by);
    const username = ensureString(post.props?.ai_generated_by_username);
    const accessibilityLabel = userId === post.userId ?
        intl.formatMessage(messages.self) :
        intl.formatMessage(messages.byUser, {username});

    return (
        <View
            accessibilityLabel={accessibilityLabel}
            testID='post_header.ai_generated_indicator'
        >
            <CompassIcon
                name='creation-outline'
                size={14}
                color={changeOpacity(theme.centerChannelColor, 0.73)}
            />
        </View>
    );
}

export default AiGeneratedIndicator;
