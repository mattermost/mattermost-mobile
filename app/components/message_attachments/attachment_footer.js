// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import {Text, View, Platform} from 'react-native';
import FastImage from 'react-native-fast-image';
import PropTypes from 'prop-types';
import truncate from 'lodash/truncate';

import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';
import {MAX_ATTACHMENT_FOOTER_LENGTH} from 'app/constants/attachment';

export default class AttachmentFooter extends PureComponent {
    static propTypes = {
        text: PropTypes.string,
        icon: PropTypes.string,
        theme: PropTypes.object.isRequired,
    };

    render() {
        const {
            text,
            icon,
            theme,
        } = this.props;

        if (!text) {
            return null;
        }

        const style = getStyleSheet(theme);

        return (
            <View style={style.container}>
                {Boolean(icon) &&
                <FastImage
                    source={{uri: icon}}
                    key='footer_icon'
                    style={style.icon}
                />
                }
                <Text
                    key='footer_text'
                    style={style.text}
                >
                    {truncate(text, {length: MAX_ATTACHMENT_FOOTER_LENGTH, omission: '…'})}
                </Text>
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
            flexDirection: 'row',
            marginTop: 5,
        },
        icon: {
            height: 12,
            width: 12,
            marginRight: 5,
            ...Platform.select({
                ios: {
                    marginTop: 1,
                },
                android: {
                    marginTop: 2,
                },
            }),
        },
        text: {
            color: changeOpacity(theme.centerChannelColor, 0.5),
            fontSize: 11,
        },
    };
});
