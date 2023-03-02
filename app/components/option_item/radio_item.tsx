// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

const RADIO_SIZE = 24;
const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        ring: {
            height: RADIO_SIZE,
            width: RADIO_SIZE,
            borderRadius: RADIO_SIZE / 2,
            marginRight: 16,
            borderWidth: 2,
            borderColor: theme.buttonBg,
            alignItems: 'center',
            justifyContent: 'center',
        },
        inActive: {
            borderColor: changeOpacity(theme.centerChannelColor, 0.56),
        },
        center: {
            height: RADIO_SIZE / 2,
            width: RADIO_SIZE / 2,
            borderRadius: RADIO_SIZE / 2,
            backgroundColor: theme.buttonBg,
        },
        checkedBodyContainer: {
            backgroundColor: theme.buttonBg,
        },
    };
});
export type RadioItemProps = {
    selected: boolean;
    checkedBody?: boolean;
    testID?: string;
}
const RadioItem = ({selected, checkedBody, testID}: RadioItemProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const getBody = useCallback(() => {
        if (checkedBody) {
            return (
                <View style={styles.checkedBodyContainer}>
                    <CompassIcon
                        color={theme.buttonColor}
                        name='check'
                        size={RADIO_SIZE / 1.5}
                    />
                </View>
            );
        }

        return (<View style={styles.center}/>);
    }, [checkedBody]);

    return (
        <View
            style={[styles.ring, !selected && styles.inActive]}
            testID={testID}
        >
            {selected && getBody()}
        </View>
    );
};

export default RadioItem;
