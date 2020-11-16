// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {Preferences} from '@mm-redux/constants';
import {changeOpacity} from '@utils/theme';

interface OtherFileProps {
    extension?: string;
}

const theme = Preferences.THEMES.default;
const iconForExtension: Record<string, string> = {
    csv: 'jumbo-attachment-excel',
    pdf: 'jumbo-attachment-pdf',
    ppt: 'jumbo-attachment-powerpoint',
    pptx: 'jumbo-attachment-powerpoint',
    xls: 'jumbo-attachment-excel',
    xlsx: 'jumbo-attachment-excel',
    zip: 'jumbo-attachment-zip',
    generic: 'jumbo-attachment-generic',
};

const OtherFile = ({extension}: OtherFileProps) => {
    let iconName = iconForExtension.generic;
    if (extension && iconForExtension[extension]) {
        iconName = iconForExtension[extension];
    }

    return (
        <View style={styles.container}>
            <View style={styles.wrapper}>
                <View style={styles.icon}>
                    <CompassIcon
                        name={iconName}
                        size={32}
                    />
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderBottomLeftRadius: 4,
        borderTopLeftRadius: 4,
        height: 48,
        marginRight: 10,
        paddingVertical: 10,
        width: 48,
    },
    icon: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    wrapper: {
        borderRightWidth: 1,
        borderRightColor: changeOpacity(theme.centerChannelColor, 0.2),
        flex: 1,
    },
});

export default OtherFile;
