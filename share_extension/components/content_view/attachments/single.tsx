// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {LayoutAnimation, TouchableOpacity, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {MAX_RESOLUTION} from '@constants/image';
import {removeShareExtensionFile} from '@share/state';
import {toFileInfo} from '@share/utils';
import {isImage, isVideo} from '@utils/file';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import Info from './info';
import Thumbnail from './thumbnail';

type Props = {
    file: SharedItem;
    maxFileSize: number;
    isSmall?: boolean;
    theme: Theme;
};

const hitSlop = {top: 10, left: 10, right: 10, bottom: 10};

const layoutAnimConfig = {
    duration: 300,
    update: {
        type: LayoutAnimation.Types.easeInEaseOut,
    },
    delete: {
        duration: 100,
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
    },
};

const getStyles = makeStyleSheetFromTheme((theme: Theme) => ({
    remove: {
        backgroundColor: theme.centerChannelBg,
        borderRadius: 12,
        height: 24,
        position: 'absolute',
        right: -5,
        top: -7,
        width: 24,
    },
}));

const Single = ({file, isSmall, maxFileSize, theme}: Props) => {
    const styles = getStyles(theme);
    const fileInfo = useMemo(() => toFileInfo(file), [file]);
    const contentMode = isSmall ? 'small' : 'large';
    const type = useMemo(() => {
        if (isImage(fileInfo)) {
            return 'image';
        }

        if (isVideo(fileInfo)) {
            return 'video';
        }

        return undefined;
    }, [fileInfo]);

    const hasError = useMemo(() => {
        const size = file.size || 0;
        if (size > maxFileSize) {
            return true;
        }

        if (type === 'image' && file.height && file.width) {
            return (file.width * file.height) > MAX_RESOLUTION;
        }

        return false;
    }, [file, maxFileSize, type]);

    const onPress = useCallback(() => {
        LayoutAnimation.configureNext(layoutAnimConfig);
        removeShareExtensionFile(file);
    }, [file]);

    let attachment;

    if (type) {
        attachment = (
            <Thumbnail
                contentMode={contentMode}
                file={file}
                hasError={hasError}
                theme={theme}
                type={type}
            />
        );
    } else {
        attachment = (
            <Info
                contentMode={contentMode}
                file={fileInfo}
                hasError={hasError}
                theme={theme}
            />
        );
    }

    if (isSmall) {
        return (
            <View>
                {attachment}
                <View style={styles.remove}>
                    <TouchableOpacity
                        hitSlop={hitSlop}
                        onPress={onPress}
                    >
                        <CompassIcon
                            name='close-circle'
                            size={24}
                            color={changeOpacity(theme.centerChannelColor, 0.56)}
                        />
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return attachment;
};

export default Single;
