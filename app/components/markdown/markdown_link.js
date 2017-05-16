// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Linking, Text} from 'react-native';

import CustomPropTypes from 'app/constants/custom_prop_types';

export default class MarkdownLink extends PureComponent {
    static propTypes = {
        children: CustomPropTypes.Children.isRequired,
        href: PropTypes.string.isRequired
    };

    handlePress = () => {
        const url = this.props.href;

        Linking.canOpenURL(url).then((supported) => {
            if (supported) {
                Linking.openURL(url);
            }
        });
    };

    render() {
        return <Text onPress={this.handlePress}>{this.props.children}</Text>;
    }
}
