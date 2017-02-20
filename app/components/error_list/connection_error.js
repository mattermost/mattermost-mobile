// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import {
    StyleSheet,
    View
} from 'react-native';
import FormattedText from 'app/components/formatted_text';

const style = StyleSheet.create({
    container: {
        alignSelf: 'stretch',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10
    }
});

export default function ConnectionError() {
    return (
        <View style={style.container}>
            <FormattedText
                id='connection.error'
                defaultMessage='Cannot reach {siteName}. Please check your connection.'
            />
        </View>
    );
}
