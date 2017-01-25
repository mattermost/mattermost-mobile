// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes} from 'react';
import {
    StyleSheet,
    View,
    Text
} from 'react-native';

const style = StyleSheet.create({
    container: {
        alignSelf: 'stretch',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10
    }
});

function ConnectionError(props) {
    return (
        <View style={style.container}>
            <Text>{'I am a general error'}</Text>
        </View>
    );
}

export default ConnectionError;
