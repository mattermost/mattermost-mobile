// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {TouchableOpacity, View} from 'react-native';

import {
    getStyleSheet as getChannelItemStyleSheet,
    ROW_HEIGHT,
    textStyle as channelItemTextStyle,
} from '@components/channel_item/channel_item';
import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import {HOME_PADDING} from '@constants/view';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {usePreventDoubleTap} from '@hooks/utils';
import {switchToGlobalPlaybooks} from '@playbooks/actions/local/checklist';
import {goToParticipantPlaybooks} from '@playbooks/screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    icon: {
        color: changeOpacity(theme.sidebarText, 0.5),
        fontSize: 24,
        marginRight: 12,
    },
    iconActive: {
        color: theme.sidebarText,
    },
    text: {
        flex: 1,
    },
}));

const PlaybooksButton = ({shouldHighlightActive = false}: {shouldHighlightActive?: boolean}) => {
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const isTablet = useIsTablet();
    const commonChannelItemStyles = getChannelItemStyleSheet(theme);
    const styles = getStyleSheet(theme);

    const handlePress = usePreventDoubleTap(useCallback(() => {
        switchToGlobalPlaybooks(serverUrl);
        goToParticipantPlaybooks(isTablet);
    }, [isTablet, serverUrl]));

    const [containerStyle, iconStyle, textStyle] = useMemo(() => {
        const container = [
            commonChannelItemStyles.container,
            HOME_PADDING,
            shouldHighlightActive && commonChannelItemStyles.activeItem,
            shouldHighlightActive && {
                paddingLeft: HOME_PADDING.paddingLeft - commonChannelItemStyles.activeItem.borderLeftWidth,
            },
            {minHeight: ROW_HEIGHT},
        ];

        const icon = [
            styles.icon,
            shouldHighlightActive && styles.iconActive,
        ];

        const text = [
            styles.text,
            channelItemTextStyle.regular,
            commonChannelItemStyles.text,
            shouldHighlightActive && commonChannelItemStyles.textActive,
        ];

        return [container, icon, text];
    }, [commonChannelItemStyles.container, commonChannelItemStyles.activeItem, commonChannelItemStyles.text, commonChannelItemStyles.textActive, shouldHighlightActive, styles.icon, styles.iconActive, styles.text]);
    return (
        <TouchableOpacity
            onPress={handlePress}
            testID='channel_list.playbooks.button'
        >
            <View style={containerStyle}>
                <CompassIcon
                    name='product-playbooks'
                    style={iconStyle}
                    testID='channel_list.playbooks.button-icon'
                />
                <FormattedText
                    id='playbooks.home_button.title'
                    defaultMessage='Playbook checklists'
                    style={textStyle}
                />
            </View>
        </TouchableOpacity>
    );
};

export default React.memo(PlaybooksButton);
