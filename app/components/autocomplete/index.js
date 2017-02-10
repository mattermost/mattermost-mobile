// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import {
    StyleSheet,
    View
} from 'react-native';

import AtMention from './at_mention';

const style = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 43,
        maxHeight: 200,
        overflow: 'hidden'
    }
});

export default function Autocomplete() {
    return (
        <View>
            <View style={style.container}>
                <AtMention/>
            </View>
        </View>
    );
}
