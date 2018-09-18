// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import {View} from 'react-native';
import PropTypes from 'prop-types';

import CustomPropTypes from 'app/constants/custom_prop_types';

import MessageAttachment from './message_attachment';

export default class MessageAttachments extends PureComponent {
    static propTypes = {
        attachments: PropTypes.array.isRequired,
        baseTextStyle: CustomPropTypes.Style,
        blockStyles: PropTypes.object,
        postId: PropTypes.string.isRequired,
        navigator: PropTypes.object.isRequired,
        onHashtagPress: PropTypes.func,
        onLongPress: PropTypes.func.isRequired,
        onPermalinkPress: PropTypes.func,
        theme: PropTypes.object,
        textStyles: PropTypes.object,
    };

    render() {
        const {
            attachments,
            baseTextStyle,
            blockStyles,
            navigator,
            onHashtagPress,
            onLongPress,
            onPermalinkPress,
            postId,
            theme,
            textStyles,
        } = this.props;
        const content = [];

        attachments.forEach((attachment, i) => {
            content.push(
                <MessageAttachment
                    attachment={attachment}
                    baseTextStyle={baseTextStyle}
                    blockStyles={blockStyles}
                    key={'att_' + i}
                    navigator={navigator}
                    onHashtagPress={onHashtagPress}
                    onLongPress={onLongPress}
                    onPermalinkPress={onPermalinkPress}
                    postId={postId}
                    theme={theme}
                    textStyles={textStyles}
                />
            );
        });

        return (
            <View style={{flex: 1, flexDirection: 'column'}}>
                {content}
            </View>
        );
    }
}
