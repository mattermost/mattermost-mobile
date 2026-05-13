// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import NavigationHeader from '@components/navigation_header';
import OtherMentionsBadge from '@components/other_mentions_badge';
import RoundedHeaderContext from '@components/rounded_header_context';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {useIsTablet} from '@hooks/device';
import {useDefaultHeaderHeight} from '@hooks/header';
import {navigateBack} from '@screens/navigation';
import {changeOpacity} from '@utils/theme';

import type {NavigationButtonProps} from '@components/navigation_button';

type Props = {
    title: string;
    subtitle: string;
    showSubtitleCompanion: boolean;
    onPress: () => void;
    onHistoryPress: () => void;
}

const AgentChatHeader = ({title, subtitle, showSubtitleCompanion, onHistoryPress, onPress}: Props) => {
    const theme = useTheme();
    const isTablet = useIsTablet();
    const defaultHeight = useDefaultHeaderHeight();

    const contextStyle = useMemo(() => ({
        top: defaultHeight,
    }), [defaultHeight]);

    const headerLeftComponent = useMemo(() => {
        if (isTablet) {
            return undefined;
        }

        return (<OtherMentionsBadge channelId={Screens.AGENT_CHAT}/>);
    }, [isTablet]);

    const subtitleCompanion = useMemo(() => {
        if (!showSubtitleCompanion) {
            return undefined;
        }

        return (
            <CompassIcon
                name='chevron-down'
                size={12}
                color={changeOpacity(theme.sidebarText, 0.72)}
            />
        );
    }, [showSubtitleCompanion, theme.sidebarText]);

    const rightButtons = useMemo<NavigationButtonProps[]>(() => [{
        iconName: 'clock-outline',
        onPress: onHistoryPress,
        testID: 'agent_chat.history_button',
    }], [onHistoryPress]);

    const onBackPress = useCallback(() => {
        navigateBack();
    }, []);

    useAndroidHardwareBackHandler(Screens.AGENT_CHAT, onBackPress);

    return (
        <>
            <NavigationHeader
                showBackButton={!isTablet}
                isLargeTitle={false}
                onBackPress={onBackPress}
                onTitlePress={onPress}
                title={title}
                leftComponent={headerLeftComponent}
                subtitle={subtitle}
                subtitleCompanion={subtitleCompanion}
                rightButtons={rightButtons}
            />
            <View style={contextStyle}>
                <RoundedHeaderContext/>
            </View>
        </>
    );
};

export default AgentChatHeader;
