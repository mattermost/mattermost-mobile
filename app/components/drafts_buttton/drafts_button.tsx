// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {DeviceEventEmitter, Text, TouchableOpacity, View} from 'react-native';

import {switchToGlobalDrafts} from '@actions/local/draft';
import {
    getStyleSheet as getChannelItemStyleSheet,
    ROW_HEIGHT,
} from '@components/channel_item/channel_item';
import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import {Events} from '@constants';
import {DRAFT} from '@constants/screens';
import {HOME_PADDING} from '@constants/view';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type DraftListProps = {
    shouldHighlightActive?: boolean;
    draftsCount: number;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    icon: {
        color: changeOpacity(theme.sidebarText, 0.5),
        fontSize: 24,
        marginRight: 12,
    },
    iconActive: {
        color: theme.sidebarText,
    },
    iconInfo: {
        color: changeOpacity(theme.centerChannelColor, 0.72),
    },
    text: {
        flex: 1,
    },
    countContainer: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    count: {
        color: theme.sidebarText,
        ...typography('Body', 75, 'SemiBold'),
        opacity: 0.64,
    },
    opacity: {
        opacity: 0.56,
    },
}));

const DraftsButton: React.FC<DraftListProps> = ({
    shouldHighlightActive = false,
    draftsCount,
}) => {
    const theme = useTheme();
    const styles = getChannelItemStyleSheet(theme);
    const customStyles = getStyleSheet(theme);
    const isTablet = useIsTablet();

    const handlePress = useCallback(preventDoubleTap(() => {
        DeviceEventEmitter.emit(Events.ACTIVE_SCREEN, DRAFT);
        switchToGlobalDrafts();
    }), []);

    const isActive = isTablet && shouldHighlightActive;

    const [containerStyle, iconStyle, textStyle] = useMemo(() => {
        const container = [
            styles.container,
            HOME_PADDING,
            isActive && styles.activeItem,
            isActive && {
                paddingLeft: HOME_PADDING.paddingLeft - styles.activeItem.borderLeftWidth,
            },
            {minHeight: ROW_HEIGHT},
        ];

        const icon = [
            customStyles.icon,
            isActive && customStyles.iconActive,
        ];

        const text = [
            customStyles.text,
            styles.text,
            isActive && styles.textActive,
        ];

        return [container, icon, text];
    }, [customStyles, isActive, styles]);

    return (
        <TouchableOpacity
            onPress={handlePress}
            testID='channel_list.drafts.button'
        >
            <View style={containerStyle}>
                <CompassIcon
                    name='send-outline'
                    style={iconStyle}
                />
                <FormattedText
                    id='drafts'
                    defaultMessage='Drafts'
                    style={textStyle}
                />
                <View style={customStyles.countContainer}>
                    <CompassIcon
                        name='pencil-outline'
                        size={14}
                        color={theme.sidebarText}
                        style={customStyles.opacity}
                    />
                    <Text
                        testID='channel_list.drafts.count'
                        style={customStyles.count}
                    >
                        {draftsCount}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );
};

export default DraftsButton;
