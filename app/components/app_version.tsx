// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet, View} from 'react-native';
import DeviceInfo from 'react-native-device-info';

import FormattedText from '@components/formatted_text';

const style = StyleSheet.create({
    info: {
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    version: {
        fontSize: 12,
    },
});

const AppVersion = () => {
    return (
        <View pointerEvents='none'>
            <View style={style.info}>
                <FormattedText
                    id='mobile.about.appVersion'
                    defaultMessage='App Version: {version} (Build {number})'
                    style={style.version}
                    values={{
                        version: DeviceInfo.getVersion(),
                        number: DeviceInfo.getBuildNumber(),
                    }}
                />
            </View>
        </View>
    );
};

export default AppVersion;
