// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet, View} from 'react-native';

import MessageAttachment from './message_attachment';

type Props = {
    attachments: MessageAttachment[];
    location: string;
    metadata?: PostMetadata;
    postId: string;
    theme: Theme;
}

const styles = StyleSheet.create({
    content: {
        flex: 1,
        flexDirection: 'column',
    },
});

const MessageAttachments = ({attachments, location, metadata, postId, theme}: Props) => {
    const content = [] as React.ReactNode[];

    attachments.forEach((attachment, i) => {
        content.push(
            <MessageAttachment
                attachment={attachment}
                key={'att_' + i.toString()}
                location={location}
                metadata={metadata}
                postId={postId}
                theme={theme}
            />,
        );
    });

    return (
        <View style={styles.content}>
            {content}
        </View>
    );
};

export default MessageAttachments;
