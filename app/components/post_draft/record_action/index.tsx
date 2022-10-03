// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {useTheme} from '@context/theme';

type Props = {
    onPress: () => void;
    testID: string;
}

const styles = {
    recordButtonContainer: {
        justifyContent: 'flex-end',
        paddingRight: 8,
    },
    recordButton: {
        borderRadius: 4,
        height: 24,
        width: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
};

function RecordButton({onPress, testID}: Props) {
    const theme = useTheme();

    return (
        <TouchableWithFeedback
            onPress={onPress}
            style={styles.recordButtonContainer}
            testID={testID}
            type={'opacity'}
        >
            <CompassIcon
                color={theme.centerChannelColor}
                name='microphone'
                size={24}
            />
        </TouchableWithFeedback>
    );
}

export default RecordButton;
