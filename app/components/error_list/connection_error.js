// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import {injectIntl} from 'react-intl';
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

function ConnectionError(intl) {
    return (
        <View style={style.container}>
            <Text>
                {
                  intl.formatMessage({
                      id: 'connection.error',
                      defaultMessage: 'Cannot reach {siteName}. Please check your connection.'
                  })
                }
            </Text>
        </View>
    );
}

export default injectIntl(ConnectionError);
