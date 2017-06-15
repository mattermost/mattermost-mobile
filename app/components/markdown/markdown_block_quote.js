// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import {
    StyleSheet,
    View
} from 'react-native';

import Icon from 'react-native-vector-icons/FontAwesome';
import CustomPropTypes from 'app/constants/custom_prop_types';

export default class MarkdownBlockQuote extends PureComponent {
    static propTypes = {
        iconStyle: CustomPropTypes.Style,
        children: CustomPropTypes.Children.isRequired
    };

    render() {
        return (
            <View style={style.container}>
                <View>
                    <Icon
                        name='quote-left'
                        style={this.props.iconStyle}
                        size={14}
                    />
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
        flexDirection: 'row'
    },
    childContainer: {
        flex: 1
    }
});
