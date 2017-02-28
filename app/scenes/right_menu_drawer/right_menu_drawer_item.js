// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component, PropTypes} from 'react';
import {StyleSheet, TouchableHighlight, View} from 'react-native';

const Styles = StyleSheet.create({
    item: {
        alignItems: 'center',
        height: 40,
        paddingLeft: 10,
        paddingRight: 10,
        flex: 1,
        flexDirection: 'row'
    }
});

export default class RightMenuDrawerItem extends Component {
    static propTypes = {
        children: PropTypes.node,
        onPress: PropTypes.func,
        style: View.propTypes.style,
        shouldRender: PropTypes.bool.isRequired
    }

    static defaultProps = {
        shouldRender: false
    }

    render() {
        const {onPress, style, children, shouldRender} = this.props;
        if (!shouldRender) {
            return null;
        }
        return (
            <TouchableHighlight
                underlayColor='rgba(255, 255, 255, 0.3)'
                onPress={onPress}
                style={style}
            >
                <View style={Styles.item}>
                    {children}
                </View>
            </TouchableHighlight>
        );
    }
}
