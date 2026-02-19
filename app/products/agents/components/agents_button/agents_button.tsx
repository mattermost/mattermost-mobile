// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {goToAgentChat} from '@agents/screens/navigation';
import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {DeviceEventEmitter, Pressable, View} from 'react-native';

import {
    getStyleSheet as getChannelItemStyleSheet,
    ROW_HEIGHT,
    textStyle as channelItemTextStyle,
} from '@components/channel_item/channel_item';
import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import {Events} from '@constants';
import {AGENTS} from '@constants/screens';
import {HOME_PADDING} from '@constants/view';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {usePreventDoubleTap} from '@hooks/utils';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

type Props = {
    shouldHighlightActive?: boolean;
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
    text: {
        flex: 1,
    },
}));

const AgentsButton = ({
    shouldHighlightActive = false,
}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const isTablet = useIsTablet();
    const commonChannelItemStyles = getChannelItemStyleSheet(theme);
    const styles = getStyleSheet(theme);

    const isActive = isTablet && shouldHighlightActive;

    const handlePress = usePreventDoubleTap(useCallback(() => {
        DeviceEventEmitter.emit(Events.ACTIVE_SCREEN, AGENTS);
        goToAgentChat(intl);
    }, [intl]));

    const [containerStyle, iconStyle, textStyle] = useMemo(() => {
        const container = [
            commonChannelItemStyles.container,
            HOME_PADDING,
            isActive && commonChannelItemStyles.activeItem,
            isActive && {
                paddingLeft: HOME_PADDING.paddingLeft - commonChannelItemStyles.activeItem.borderLeftWidth,
            },
            {minHeight: ROW_HEIGHT},
        ];

        const icon = [
            styles.icon,
            isActive && styles.iconActive,
        ];

        const text = [
            styles.text,
            channelItemTextStyle.regular,
            commonChannelItemStyles.text,
            isActive && commonChannelItemStyles.textActive,
        ];

        return [container, icon, text];
    }, [styles, commonChannelItemStyles, isActive]);

    return (
        <Pressable
            style={({pressed}) => [pressed && {opacity: 0.72}]}
            onPress={handlePress}
            testID='channel_list.agents.button'
        >
            <View style={containerStyle}>
                <CompassIcon
                    name='creation-outline'
                    style={iconStyle}
                    testID='channel_list.agents.button-icon'
                />
                <FormattedText
                    id='agents.home_button.title'
                    defaultMessage='Agents'
                    style={textStyle}
                />
            </View>
        </Pressable>
    );
};

export default React.memo(AgentsButton);
