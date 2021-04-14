// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleProp, TextStyle, View, ViewStyle} from 'react-native';

import {MessageAttachment as MessageAttachmentType} from '@mm-redux/types/message_attachments';
import {PostMetadata} from '@mm-redux/types/posts';
import {Theme} from '@mm-redux/types/preferences';

import MessageAttachment from './message_attachment';

type Props = {
    attachments: MessageAttachmentType[],
        baseTextStyle?: StyleProp<TextStyle>,
        blockStyles?: StyleProp<ViewStyle>[],
        deviceHeight: number,
        deviceWidth: number,
        postId: string,
        metadata?: PostMetadata,
        onPermalinkPress?: () => void,
        theme: Theme,
        textStyles?: StyleProp<TextStyle>[],
}

export default function MessageAttachments(props: Props) {
    const {
        attachments,
        baseTextStyle,
        blockStyles,
        deviceHeight,
        deviceWidth,
        metadata,
        onPermalinkPress,
        postId,
        theme,
        textStyles,
    } = props;
    const content = [] as React.ReactNode[];

    attachments.forEach((attachment, i) => {
        content.push(
            <MessageAttachment
                attachment={attachment}
                baseTextStyle={baseTextStyle}
                blockStyles={blockStyles}
                deviceHeight={deviceHeight}
                deviceWidth={deviceWidth}
                key={'att_' + i}
                metadata={metadata}
                onPermalinkPress={onPermalinkPress}
                postId={postId}
                theme={theme}
                textStyles={textStyles}
            />,
        );
    });

    return (
        <View style={{flex: 1, flexDirection: 'column'}}>
            {content}
        </View>
    );
}
