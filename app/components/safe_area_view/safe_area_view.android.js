// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {StyleSheet, View} from 'react-native';

export default class SafeAreaAndroid extends PureComponent {
    static propTypes = {
        children: PropTypes.node.isRequired
    };

    render() {
        return (
            <View style={style.container}>
                {this.props.children}
            </View>
        );
    }
}

const style = StyleSheet.create({
    container: {
        flex: 1
    }
});
