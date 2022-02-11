// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect} from 'react';
import {useIntl} from 'react-intl';
import {DeviceEventEmitter, Text, View} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';

import {ITEM_HEIGHT} from '@app/components/slide_up_panel_item';
import {useIsTablet} from '@app/hooks/device';
import PlusMenuList from '@app/screens/home/channel_list/plus_menu';
import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {Events, Screens} from '@constants';
import {useServerDisplayName} from '@context/server';
import {useTheme} from '@context/theme';
import {bottomSheet, showModal} from '@screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    displayName: string;
    iconPad?: boolean;
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
}));

const ChannelListHeader = ({displayName, iconPad}: Props) => {
    const theme = useTheme();
    const isTablet = useIsTablet();
    const intl = useIntl();
    const serverDisplayName = useServerDisplayName();
    const marginLeft = useSharedValue(iconPad ? 44 : 0);
    const styles = getStyles(theme);
    const animatedStyle = useAnimatedStyle(() => ({
        marginLeft: withTiming(marginLeft.value, {duration: 350}),
    }), []);

    useEffect(() => {
        marginLeft.value = iconPad ? 44 : 0;
    }, [iconPad]);

    const onPress = useCallback(() => {
        const renderContent = () => {
            return (
                <>
                    <PlusMenuList
                        pickerAction='browseChannels'
                        onPress={() => {
                            DeviceEventEmitter.emit(Events.CLOSE_BOTTOM_SHEET);
                            const showBrowseChannelModal = async () => {
                                const title = intl.formatMessage({id: 'browse_channels.title', defaultMessage: 'More Channels'});
                                const closeButton = await CompassIcon.getImageSource('close', 24, theme.sidebarHeaderTextColor);
                                showModal(Screens.BROWSE_CHANNELS, title, {
                                    closeButton,
                                });
                            };
                            showBrowseChannelModal();
                        }}
                    />
                    <PlusMenuList
                        pickerAction='createNewChannel'
                        onPress={() => {
                            //this is a click
                        }}
                    />
                    <PlusMenuList
                        pickerAction='openDirectMessage'
                        onPress={() => {
                            //this is a click
                        }}
                    />
                </>
            );
        };

        const closeButtonId = 'close-plus-menu';
        bottomSheet({
            closeButtonId,
            renderContent,
            snapPoints: [4 * ITEM_HEIGHT, 10],
            theme,
            title: 'Plus Menu',
        });
    }, [intl, isTablet, theme]);

    return (
        <Animated.View style={animatedStyle}>
            {Boolean(displayName) &&
            <View style={styles.headerRow}>
                <View style={styles.headerRow}>
                    <Text style={styles.headingStyles}>
                        {displayName}
                    </Text>
                    <TouchableWithFeedback style={styles.chevronButton}>
                        <CompassIcon
                            style={styles.chevronIcon}
                            name={'chevron-down'}
                        />
                    </TouchableWithFeedback>
                </View>
                <TouchableWithFeedback
                    style={styles.plusButton}
                    onPress={onPress}
                >
                    <CompassIcon
                        style={styles.plusIcon}
                        name={'plus'}
                    />
                </TouchableWithFeedback>
            </View>
            }
            <Text style={styles.subHeadingStyles}>
                {serverDisplayName}
            </Text>
        </Animated.View>
    );
};

export default ChannelListHeader;
