// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import {View} from 'react-native';
import PropTypes from 'prop-types';

import CustomPropTypes from 'app/constants/custom_prop_types';

import SlackAttachment from './slack_attachment';

export default class SlackAttachments extends PureComponent {
    static propTypes = {
        attachments: PropTypes.array.isRequired,
        baseTextStyle: CustomPropTypes.Style,
        blockStyles: PropTypes.object,
        textStyles: PropTypes.object,
        navigator: PropTypes.object.isRequired,
        theme: PropTypes.object,
        onLongPress: PropTypes.func.isRequired
    };

    render() {
        const {attachments, baseTextStyle, blockStyles, navigator, textStyles, theme, onLongPress} = this.props;
        const content = [];

        attachments.forEach((attachment, i) => {
            content.push(
                <SlackAttachment
                    attachment={attachment}
                    baseTextStyle={baseTextStyle}
                    blockStyles={blockStyles}
                    key={'att_' + i}
                    textStyles={textStyles}
                    navigator={navigator}
                    theme={theme}
                    onLongPress={onLongPress}
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
