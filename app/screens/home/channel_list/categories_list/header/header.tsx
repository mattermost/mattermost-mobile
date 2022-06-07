// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect} from 'react';
import {useIntl} from 'react-intl';
import {Insets, Text, View} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {logout} from '@actions/remote/session';
import CompassIcon from '@components/compass_icon';
import {ITEM_HEIGHT} from '@components/slide_up_panel_item';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {PUSH_PROXY_STATUS_NOT_AVAILABLE, PUSH_PROXY_STATUS_VERIFIED} from '@constants/push_proxy';
import {useServerDisplayName, useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {bottomSheet} from '@screens/navigation';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {alertPushProxyError, alertPushProxyUnknown} from '@utils/push_proxy';
import {alertServerLogout} from '@utils/server';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import LoadingUnreads from './loading_unreads';
import PlusMenu from './plus_menu';

type Props = {
    canCreateChannels: boolean;
    canJoinChannels: boolean;
    displayName: string;
    iconPad?: boolean;
    onHeaderPress?: () => void;
    pushProxyStatus: string;
}

const getStyles = makeStyleSheetFromTheme((theme: Theme) => ({
    headingStyles: {
        color: theme.sidebarText,
        ...typography('Heading', 700),
    },
    subHeadingStyles: {
        color: changeOpacity(theme.sidebarText, 0.64),
        ...typography('Heading', 50),
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    chevronButton: {
        marginLeft: 4,
    },
    chevronIcon: {
        color: changeOpacity(theme.sidebarText, 0.8),
        fontSize: 24,
    },
    plusButton: {
        backgroundColor: changeOpacity(theme.sidebarText, 0.08),
        height: 28,
        width: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    plusIcon: {
        color: changeOpacity(theme.sidebarText, 0.8),
        fontSize: 18,
    },
    pushAlert: {
        marginLeft: 5,
    },
    subHeadingView: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: 60,
    },
    noTeamHeadingStyles: {
        color: changeOpacity(theme.sidebarText, 0.64),
        ...typography('Body', 100, 'SemiBold'),
    },
    noTeamHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 40,
    },
}));

const hitSlop: Insets = {top: 10, bottom: 30, left: 20, right: 20};

const ChannelListHeader = ({
    canCreateChannels,
    canJoinChannels,
    displayName,
    iconPad,
    onHeaderPress,
    pushProxyStatus,
}: Props) => {
    const theme = useTheme();
    const isTablet = useIsTablet();
    const intl = useIntl();
    const insets = useSafeAreaInsets();
    const serverDisplayName = useServerDisplayName();
    const marginLeft = useSharedValue(iconPad ? 44 : 0);
    const styles = getStyles(theme);
    const animatedStyle = useAnimatedStyle(() => ({
        marginLeft: withTiming(marginLeft.value, {duration: 350}),
    }), []);
    const serverUrl = useServerUrl();
    useEffect(() => {
        marginLeft.value = iconPad ? 44 : 0;
    }, [iconPad]);

    const onPress = useCallback(() => {
        const renderContent = () => {
            return (
                <PlusMenu
                    canCreateChannels={canCreateChannels}
                    canJoinChannels={canJoinChannels}
                />
            );
        };

        const closeButtonId = 'close-plus-menu';
        let items = 1;
        if (canCreateChannels) {
            items += 1;
        }

        if (canJoinChannels) {
            items += 1;
        }

        bottomSheet({
            closeButtonId,
            renderContent,
            snapPoints: [bottomSheetSnapPoint(items, ITEM_HEIGHT, insets.bottom), 10],
            theme,
            title: intl.formatMessage({id: 'home.header.plus_menu', defaultMessage: 'Options'}),
        });
    }, [intl, insets, isTablet, theme]);

    const onPushAlertPress = useCallback(() => {
        if (pushProxyStatus === PUSH_PROXY_STATUS_NOT_AVAILABLE) {
            alertPushProxyError(intl);
        } else {
            alertPushProxyUnknown(intl);
        }
    }, [pushProxyStatus, intl]);

    const onLogoutPress = useCallback(() => {
        alertServerLogout(serverDisplayName, () => logout(serverUrl), intl);
    }, []);

    let header;
    if (displayName) {
        header = (
            <>
                <View style={styles.headerRow}>
                    <TouchableWithFeedback
                        onPress={onHeaderPress}
                        type='opacity'
                    >
                        <View style={styles.headerRow}>
                            <Text
                                style={styles.headingStyles}
                                testID='channel_list_header.team_display_name'
                            >
                                {displayName}
                            </Text>
                            <View
                                style={styles.chevronButton}
                                testID='channel_list_header.chevron.button'
                            >
                                <CompassIcon
                                    style={styles.chevronIcon}
                                    name={'chevron-down'}
                                />
                            </View>
                        </View>
                    </TouchableWithFeedback>
                    <TouchableWithFeedback
                        hitSlop={hitSlop}
                        onPress={onPress}
                        style={styles.plusButton}
                        testID='channel_list_header.plus.button'
                        type='opacity'
                    >
                        <CompassIcon
                            style={styles.plusIcon}
                            name={'plus'}
                        />
                    </TouchableWithFeedback>
                </View>
                <View style={styles.subHeadingView}>
                    <Text
                        numberOfLines={1}
                        ellipsizeMode='tail'
                        style={styles.subHeadingStyles}
                        testID='channel_list_header.server_display_name'
                    >
                        {serverDisplayName}
                    </Text>
                    <LoadingUnreads/>
                    {(pushProxyStatus !== PUSH_PROXY_STATUS_VERIFIED) && (
                        <TouchableWithFeedback
                            onPress={onPushAlertPress}
                            testID='channel_list_header.push_alert'
                            type='opacity'
                        >
                            <CompassIcon
                                name='alert-outline'
                                color={theme.errorTextColor}
                                size={14}
                                style={styles.pushAlert}
                            />
                        </TouchableWithFeedback>
                    )}
                </View>
            </>
        );
    } else {
        header = (
            <View style={styles.noTeamHeaderRow}>
                <View style={[styles.noTeamHeaderRow, {flex: 1}]}>
                    <Text
                        numberOfLines={1}
                        ellipsizeMode='tail'
                        style={styles.noTeamHeadingStyles}
                        testID='channel_list_header.team_display_name'
                    >
                        {serverDisplayName}
                    </Text>
                </View>
                <TouchableWithFeedback
                    onPress={onLogoutPress}
                    testID='channel_list_header.logout.button'
                    type='opacity'
                >
                    <Text
                        style={styles.noTeamHeadingStyles}
                        testID='channel_list_header.team_display_name'
                    >
                        {intl.formatMessage({id: 'account.logout', defaultMessage: 'Log out'})}
                    </Text>
                </TouchableWithFeedback>
            </View>
        );
    }

    return (
        <Animated.View style={animatedStyle}>
            {header}
        </Animated.View>
    );
};

export default ChannelListHeader;
