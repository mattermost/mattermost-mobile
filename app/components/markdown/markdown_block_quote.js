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
        blockStyle: CustomPropTypes.Style,
        children: CustomPropTypes.Children.isRequired
    };

    render() {
        return (
            <View style={style.container}>
                <View>
                    <Icon
                        name='quote-left'
                        style={this.props.blockStyle}
                        size={14}
                        left={0}
                        top={0}
                        position='absolute'
                    />
                </View>
                <View style={{paddingLeft: 5}}>
                    {this.props.children}
                </View>
            </View>
        );
    }
}

const style = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingLeft: 20
    }
});
