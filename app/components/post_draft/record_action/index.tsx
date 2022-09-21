// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {useTheme} from '@context/theme';

type Props = {
    onPress: () => void;
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

function RecordButton({onPress}: Props) {
    const theme = useTheme();

    return (
        <TouchableWithFeedback
            testID='record.button'
            onPress={onPress}
            style={styles.recordButtonContainer}
            type={'opacity'}
        >
            <CompassIcon
                name='microphone'
                size={24}
                color={theme.centerChannelColor}
            />
        </TouchableWithFeedback>
    );
}

export default RecordButton;
