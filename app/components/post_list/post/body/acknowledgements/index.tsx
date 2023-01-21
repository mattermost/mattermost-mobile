// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {View, Text, TouchableOpacity} from 'react-native';

import {acknowledgePost, unacknowledgePost} from '@actions/remote/post';
import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import {useServerUrl} from '@context/server';
import {moreThan5minAgo} from '@utils/post';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type PostModel from '@typings/database/models/servers/post';
import type UserModel from '@typings/database/models/servers/user';

type Props = {
    currentUser: UserModel;
    hasReactions: boolean;
    post: PostModel;
    theme: Theme;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            alignItems: 'center',
            borderRadius: 4,
            backgroundColor: changeOpacity(theme.onlineIndicator, 0.12),
            flexDirection: 'row',
            height: 32,
            justifyContent: 'center',
            paddingHorizontal: 8,
        },
        text: {
            ...typography('Body', 100, 'SemiBold'),
            color: theme.onlineIndicator,
        },
        icon: {
            marginRight: 4,
        },
        divider: {
            width: 1,
            height: 32,
            marginHorizontal: 8,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.16),
        },
    };
});

const Acknowledgements = ({currentUser, hasReactions, post, theme}: Props) => {
    const style = getStyleSheet(theme);
    const serverUrl = useServerUrl();

    const isCurrentAuthor = post.userId === currentUser.id;
    const acknowledgements = post.metadata?.acknowledgements || [];

    let acknowledgedAt = 0;
    if (acknowledgements.length) {
        const ack = acknowledgements.find((item) => item.user_id === currentUser.id);
        if (ack) {
            acknowledgedAt = ack.acknowledged_at;
        }
    }

    const handleOnPress = useCallback(() => {
        if ((acknowledgedAt && moreThan5minAgo(acknowledgedAt)) || isCurrentAuthor) {
            return;
        }
        if (acknowledgedAt) {
            unacknowledgePost(serverUrl, post.id);
        } else {
            acknowledgePost(serverUrl, post.id);
        }
    }, [acknowledgedAt, isCurrentAuthor, post, serverUrl]);

    const handleOnLongPress = useCallback(() => {
        //
    }, []);

    return (
        <>
            <TouchableOpacity
                onPress={handleOnPress}
                onLongPress={handleOnLongPress}
                style={[style.container]}
            >
                <CompassIcon
                    color={theme.onlineIndicator}
                    name='check-circle-outline'
                    size={24}
                    style={style.icon}
                />
                {isCurrentAuthor || acknowledgements.length ? (
                    <Text style={style.text}>
                        {acknowledgements.length}
                    </Text>
                ) : (
                    <FormattedText
                        id='post_priority.button.acknowledge'
                        defaultMessage='Acknowledge'
                        style={style.text}
                    />
                )}
            </TouchableOpacity>
            {hasReactions && <View style={style.divider}/>}
        </>
    );
};

export default Acknowledgements;
