// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    StyleSheet,
    View,
} from 'react-native';

import Icon from 'react-native-vector-icons/FontAwesome';
import CustomPropTypes from 'app/constants/custom_prop_types';

export default class MarkdownBlockQuote extends PureComponent {
    static propTypes = {
        continue: PropTypes.bool,
        iconStyle: CustomPropTypes.Style,
        children: CustomPropTypes.Children.isRequired,
    };

    render() {
        let icon;
        if (!this.props.continue) {
            icon = (
                <Icon
                    name='quote-left'
                    style={this.props.iconStyle}
                    size={14}
                />
            );
        }

        return (
            <View style={style.container}>
                <View style={style.icon}>
                    {icon}
                </View>
                <View style={style.childContainer}>
                    {this.props.children}
                </View>
            </View>
        );
    }
}

const style = StyleSheet.create({
    container: {
        alignItems: 'flex-start',
        flexDirection: 'row',
    },
    childContainer: {
        flex: 1,
    },
    icon: {
        width: 23,
    },
});
