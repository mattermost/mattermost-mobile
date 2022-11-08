// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useState} from 'react';
import FastImage from 'react-native-fast-image';

import {useTheme} from '@app/context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@app/utils/theme';
import {isValidUrl} from '@app/utils/url';

import CompassIcon from '../compass_icon';

type OptionIconProps = {
    destructive?: boolean;
    icon: string;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        destructive: {
            color: theme.dndIndicator,
        },
        icon: {
            fontSize: 24,
            color: changeOpacity(theme.centerChannelColor, 0.64),
            width: 24,
            height: 24,
        },
    };
});

const OptionIcon = ({icon, destructive}: OptionIconProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const imageStyle = useMemo(() => (
        [styles.icon, destructive ? styles.destructive : null]
    ), [styles.icon, styles.destructive, destructive]);

    const [failedToLoadImage, setFailedToLoadImage] = useState(false);
    const onErrorLoadingIcon = useCallback(() => {
        setFailedToLoadImage(true);
    }, []);

    const iconAsSource = useMemo(() => {
        return {uri: icon};
    }, [icon]);

    if (isValidUrl(icon) && !failedToLoadImage) {
        return (
            <FastImage
                source={iconAsSource}
                style={imageStyle}
                onError={onErrorLoadingIcon}
            />
        );
    }

    const iconName = failedToLoadImage ? 'power-plugin-outline' : icon;
    return (
        <CompassIcon
            name={iconName}
            size={24}
            color={destructive ? theme.dndIndicator : changeOpacity(theme.centerChannelColor, 0.64)}
        />
    );
};

export default OptionIcon;
