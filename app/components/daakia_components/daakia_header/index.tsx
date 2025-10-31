// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {View, Text} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {ITEM_HEIGHT} from '@components/slide_up_panel_item';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {useTheme} from '@context/theme';
import PlusMenu from '@screens/home/channel_list/categories_list/header/plus_menu';
import {SEPARATOR_HEIGHT} from '@screens/home/channel_list/categories_list/header/plus_menu/separator';
import {bottomSheet, findChannels} from '@screens/navigation';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    title: string;
    label?: string;
    onMenuPress?: () => void;
    canCreateChannels?: boolean;
    canJoinChannels?: boolean;
    canInvitePeople?: boolean;
    showMenu?: boolean;
}

const getStyles = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.sidebarBg,
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    leftSection: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    textContainer: {
        flexDirection: 'column',
        flex: 1,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    menuButton: {
        backgroundColor: 'transparent',
        height: 40,
        width: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    menuIcon: {
        color: theme.sidebarText,
        fontSize: 24,
    },
    title: {
        color: theme.sidebarText,
        ...typography('Heading', 700),
        flex: 1,
    },
    label: {
        color: theme.sidebarText,
        ...typography('Body', 50, 'SemiBold'),
        opacity: 0.64,
        marginBottom: 2,
        textTransform: 'uppercase',
    },
    plusButton: {
        backgroundColor: changeOpacity(theme.sidebarText, 0.12),
        height: 36,
        width: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        marginLeft: 8,
    },
    plusIcon: {
        color: theme.sidebarText,
        fontSize: 18,
    },
    searchButton: {
        backgroundColor: changeOpacity(theme.sidebarText, 0.12),
        height: 36,
        width: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        marginLeft: 8,
    },
    searchIcon: {
        color: theme.sidebarText,
        fontSize: 18,
    },
}));

const DaakiaHeader = ({title, label, onMenuPress, canCreateChannels, canJoinChannels, canInvitePeople, showMenu = true}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const styles = getStyles(theme);

    const onPlusPress = useCallback(() => {
        const renderContent = () => (
            <PlusMenu
                canCreateChannels={Boolean(canCreateChannels)}
                canJoinChannels={Boolean(canJoinChannels)}
                canInvitePeople={Boolean(canInvitePeople)}
            />
        );

        const closeButtonId = 'close-plus-menu';
        let items = 1; // DM
        let separators = 0;
        if (canCreateChannels) {
            items += 1;
        }
        if (canJoinChannels) {
            items += 1;
        }
        if (canInvitePeople) {
            items += 1;
            separators += 1;
        }

        bottomSheet({
            closeButtonId,
            renderContent,
            snapPoints: [1, bottomSheetSnapPoint(items, ITEM_HEIGHT) + (separators * SEPARATOR_HEIGHT)],
            theme,
            title: intl.formatMessage({id: 'home.header.plus_menu', defaultMessage: 'Options'}),
        });
    }, [intl, theme, canCreateChannels, canInvitePeople, canJoinChannels]);

    const onSearchPress = useCallback(() => {
        findChannels(
            intl.formatMessage({id: 'find_channels.title', defaultMessage: 'Find Channels'}),
            theme,
        );
    }, [intl, theme]);

    return (
        <View style={styles.container}>
            <View style={styles.leftSection}>
                {showMenu && (
                    <TouchableWithFeedback
                        onPress={onMenuPress}
                        style={styles.menuButton}
                        type='opacity'
                    >
                        <CompassIcon
                            style={styles.menuIcon}
                            name='menu'
                        />
                    </TouchableWithFeedback>
                )}
                <View style={styles.textContainer}>
                    {Boolean(label) && (
                        <Text
                            numberOfLines={1}
                            ellipsizeMode='tail'
                            style={styles.label}
                        >
                            {label}
                        </Text>
                    )}
                    <View style={styles.titleRow}>
                        <Text
                            numberOfLines={1}
                            ellipsizeMode='tail'
                            style={styles.title}
                        >
                            {title}
                        </Text>
                        <TouchableWithFeedback
                            onPress={onSearchPress}
                            style={styles.searchButton}
                            type='opacity'
                        >
                            <CompassIcon
                                style={styles.searchIcon}
                                name='magnify'
                            />
                        </TouchableWithFeedback>
                        <TouchableWithFeedback
                            onPress={onPlusPress}
                            style={styles.plusButton}
                            type='opacity'
                        >
                            <CompassIcon
                                style={styles.plusIcon}
                                name='plus'
                            />
                        </TouchableWithFeedback>
                    </View>
                </View>
            </View>
        </View>
    );
};

export default DaakiaHeader;
