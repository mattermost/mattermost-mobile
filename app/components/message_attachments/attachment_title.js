// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import {Linking, Text, View} from 'react-native';
import PropTypes from 'prop-types';

import {makeStyleSheetFromTheme} from 'app/utils/theme';

export default class AttachmentTitle extends PureComponent {
    static propTypes = {
        link: PropTypes.string,
        theme: PropTypes.object.isRequired,
        value: PropTypes.string,
    };

    openLink = () => {
        const {link} = this.props;
        if (link && Linking.canOpenURL(link)) {
            Linking.openURL(link);
        }
    };

    render() {
        const {
            link,
            value,
            theme,
        } = this.props;

        if (!value) {
            return null;
        }

        const style = getStyleSheet(theme);

        return (
            <View style={style.container}>
                <Text
                    style={[style.title, Boolean(link) && style.link]}
                    onPress={this.openLink}
                >
                    {value}
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
        },
        title: {
            color: theme.centerChannelColor,
            fontWeight: '600',
            marginBottom: 5,
        },
        link: {
            color: theme.linkColor,
        },
    };
});
