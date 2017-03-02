// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component, PropTypes} from 'react';
import {StyleSheet, TouchableHighlight, View} from 'react-native';

const styles = StyleSheet.create({
    item: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        height: 40,
        paddingHorizontal: 10
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
        shouldRender: true
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
                <View style={styles.item}>
                    {children}
                </View>
            </TouchableHighlight>
        );
    }
}
