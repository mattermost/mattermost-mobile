// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import CompassIcon from '@components/compass_icon';
import {Theme} from '@mm-redux/types/preferences';
import {changeOpacity} from '@utils/theme';
import {preventDoubleTap} from '@utils/tap';

interface Props {
    handlePress: () => void;
    size?: number;
    theme: Theme;
}

const ClearButton = (props: Props) => {
    const {handlePress, size, theme} = props;

    return (
        <CompassIcon
            onPress={preventDoubleTap(handlePress)}
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
    size: 20,
};

export default ClearButton;
