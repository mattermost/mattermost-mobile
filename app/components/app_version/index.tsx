// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet, TextStyle, View} from 'react-native';
import DeviceInfo from 'react-native-device-info';

import FormattedText from '@components/formatted_text';
import {t} from '@i18n';

const style = StyleSheet.create({
    info: {
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    version: {
        fontSize: 12,
    },
});

type AppVersionProps = {
    isWrapped?: boolean;
    textStyle?: TextStyle;
}

const AppVersion = ({isWrapped = true, textStyle = {}}: AppVersionProps) => {
    const appVersion = (
        <FormattedText
            id={t('mobile.about.appVersion')}
            defaultMessage='App Version: {version} (Build {number})'
            style={StyleSheet.flatten([style.version, textStyle])}
            values={{
                version: DeviceInfo.getVersion(),
                number: DeviceInfo.getBuildNumber(),
            }}
        />
    );

    if (!isWrapped) {
        return appVersion;
    }

    return (
        <View pointerEvents='none'>
            <View style={style.info}>
                {appVersion}
            </View>
        </View>
    );
};

export default AppVersion;
