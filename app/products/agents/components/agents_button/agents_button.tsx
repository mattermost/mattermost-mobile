// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {goToAgentChat} from '@agents/screens/navigation';
import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {TouchableOpacity, View} from 'react-native';

import {
    getStyleSheet as getChannelItemStyleSheet,
    ROW_HEIGHT,
    textStyle as channelItemTextStyle,
} from '@components/channel_item/channel_item';
import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import {HOME_PADDING} from '@constants/view';
import {useTheme} from '@context/theme';
import {usePreventDoubleTap} from '@hooks/utils';
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

const AgentsButton = () => {
    const intl = useIntl();
    const theme = useTheme();
    const commonChannelItemStyles = getChannelItemStyleSheet(theme);
    const styles = getStyleSheet(theme);

    const handlePress = usePreventDoubleTap(useCallback(() => {
        goToAgentChat(intl);
    }, [intl]));

    const [containerStyle, iconStyle, textStyle] = useMemo(() => {
        const container = [
            commonChannelItemStyles.container,
            HOME_PADDING,
            {minHeight: ROW_HEIGHT},
        ];

        const icon = [
            styles.icon,
        ];

        const text = [
            styles.text,
            channelItemTextStyle.regular,
            commonChannelItemStyles.text,
        ];

        return [container, icon, text];
    }, [styles, commonChannelItemStyles]);

    return (
        <TouchableOpacity
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
        </TouchableOpacity>
    );
};

export default React.memo(AgentsButton);
