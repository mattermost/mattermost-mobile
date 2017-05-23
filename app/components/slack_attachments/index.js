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
        theme: PropTypes.object
    };

    render() {
        const {attachments, baseTextStyle, blockStyles, textStyles, theme} = this.props;
        const content = [];

        attachments.forEach((attachment, i) => {
            content.push(
                <SlackAttachment
                    attachment={attachment}
                    baseTextStyle={baseTextStyle}
                    blockStyles={blockStyles}
                    key={'att_' + i}
                    textStyles={textStyles}
                    theme={theme}
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
