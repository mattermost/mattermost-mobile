// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Linking, Text} from 'react-native';

import CustomPropTypes from 'app/constants/custom_prop_types';

export default class MarkdownLink extends PureComponent {
    static propTypes = {
        children: CustomPropTypes.Children.isRequired,
        href: PropTypes.string.isRequired,
        onLongPress: PropTypes.func
    };

    static defaultProps = {
        onLongPress: () => true
    }

    handlePress = () => {
        // Android doesn't like the protocol being upper case
        let url = this.props.href;

        const index = url.indexOf(':');
        if (index !== -1) {
            const protocol = url.substring(0, index);
            url = protocol.toLowerCase() + url.substring(index);
        }

        Linking.canOpenURL(url).then((supported) => {
            if (supported) {
                Linking.openURL(url);
            }
        });
    };

    render() {
        return (
            <Text
                onPress={this.handlePress}
                onLongPress={this.props.onLongPress}
            >
                {this.props.children}
            </Text>
        );
    }
}
