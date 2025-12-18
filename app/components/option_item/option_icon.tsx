// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useState} from 'react';

import CompassIcon from '@components/compass_icon';
import ExpoImage from '@components/expo_image';
import {useTheme} from '@context/theme';
import {urlSafeBase64Encode} from '@utils/security';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {isValidUrl} from '@utils/url';

type OptionIconProps = {
    icon: string;
    iconColor?: string;
    destructive?: boolean;
};

const getStyleSheet = makeStyleSheetFromTheme(() => {
    return {
        icon: {
            fontSize: 24,
            width: 24,
            height: 24,
        },
    };
});

const OptionIcon = ({icon, iconColor, destructive}: OptionIconProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const [failedToLoadImage, setFailedToLoadImage] = useState(false);
    const onErrorLoadingIcon = useCallback(() => {
        setFailedToLoadImage(true);
    }, []);

    const iconAsSource = useMemo(() => {
        return {uri: icon};
    }, [icon]);

    if (isValidUrl(icon) && !failedToLoadImage) {
        return (
            <ExpoImage
                id={`option-icon-${urlSafeBase64Encode(icon)}`}
                source={iconAsSource}
                style={styles.icon}
                onError={onErrorLoadingIcon}
            />
        );
    }

    const iconName = failedToLoadImage ? 'power-plugin-outline' : icon;
    return (
        <CompassIcon
            name={iconName}
            size={24}
            color={iconColor || (destructive ? theme.dndIndicator : changeOpacity(theme.centerChannelColor, 0.64))}
        />
    );
};

export default OptionIcon;
