// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import CompassIcon from '@components/compass_icon';
import {Theme} from '@mm-redux/types/preferences';
import {changeOpacity} from '@utils/theme';
import {GestureResponderEvent} from 'react-native';

interface Props {
    handlePress: () => void;
    size?: number;
    theme: Theme;
}

const ClearButton = (props: Props) => {
    const {handlePress, size, theme} = props;
    const onPress = (event: GestureResponderEvent) => {
        event.stopPropagation();
        handlePress();
    };

    return (
        <CompassIcon
            onPress={onPress}
            name='close'
            size={size}
            color={theme.centerChannelBg}
            style={{
                backgroundColor: changeOpacity(theme.centerChannelColor, 0.52),
                borderRadius: 1000,
            }}
        />
    );
};

ClearButton.defaultProps = {
    size: 24,
};

export default ClearButton;
