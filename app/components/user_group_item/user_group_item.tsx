// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, type ReactNode} from 'react';
import {useIntl} from 'react-intl';
import {StyleSheet, Text, TouchableOpacity, View, type StyleProp, type ViewStyle} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {nonBreakingString} from '@utils/strings';
import {makeStyleSheetFromTheme, changeOpacity, useStyling} from '@utils/theme';
import {typography} from '@utils/typography';

import type {GroupModel} from '@app/database/models/server';

type TGroup = Group | GroupModel;

type Props = {
    footer?: ReactNode;
    group: TGroup;
    containerStyle?: StyleProp<ViewStyle>;
    currentUserId: string;
    size?: number;
    testID?: string;
    locale?: string;
    rightDecorator?: React.ReactNode;
    onGroupPress?: (group: TGroup) => void;
    onGroupLongPress?: (group: TGroup) => void;
    onLayout?: () => void;
    disabled?: boolean;
    viewRef?: React.LegacyRef<View>;
    padding?: number;
    spacing?: 'compact' | 'normal' | 'spacious';
}

const getThemedStyles = makeStyleSheetFromTheme((theme) => {
    return {
        rowPicture: {
            marginRight: 10,
            marginLeft: 2,
            width: 24,
            alignItems: 'center',
            justifyContent: 'center',
        },
        rowFullname: {
            ...typography('Body', 200),
            color: theme.centerChannelColor,
            flex: 0,
            flexShrink: 1,
        },
        rowUsername: {
            ...typography('Body', 100),
            flex: 0,
            flexShrink: 1,
            color: changeOpacity(theme.centerChannelColor, 0.64),
        },
    };
});

const nonThemedStyles = StyleSheet.create({
    rowInfoBaseContainer: {
        flex: 1,
        paddingVertical: 4,
    },
    rowInfoContainer: {
        flex: 0,
        flexShrink: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    details: {
        flex: 0,
        flexShrink: 1,
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    tag: {
        marginLeft: 6,
    },
    rightContainer: {
        marginLeft: 'auto',
    },
});

const UserGroupItem = ({
    footer,
    group,
    containerStyle,
    spacing = 'normal',
    size = ({compact: 16, normal: 20, spacious: 24})[spacing],
    testID,
    rightDecorator,
    onLayout,
    onGroupPress,
    onGroupLongPress,
    disabled = false,
    viewRef,
    padding = 20,
}: Props) => {
    const {styles} = useStyling((t) => {
        const iconSize = ({compact: 24, normal: 32, spacious: 40})[spacing];

        return {
            ...getThemedStyles(t),
            row: {
                height: ({compact: 32, normal: 48, spacious: 56})[spacing],
                paddingHorizontal: padding,
                flexDirection: 'row',
                alignItems: 'center',
                opacity: disabled ? 0.32 : 1,
            },
            iconContainer: {
                marginRight: 12,
                width: iconSize,
                height: iconSize,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: changeOpacity(t.centerChannelColor, 0.08),
            },
            icon: {
                color: changeOpacity(t.centerChannelColor, 0.56),
            },

        };
    }, [disabled, padding, spacing]);
    const intl = useIntl();

    const onPress = useCallback(() => {
        if (group) {
            onGroupPress?.(group);
        }
    }, [group, onGroupPress]);

    const onLongPress = useCallback(() => {
        if (group) {
            onGroupLongPress?.(group);
        }
    }, [group, onGroupLongPress]);

    const userGroupItemTestId = `${testID}.${group?.id}`;

    const memberCount = 'memberCount' in group ? group.memberCount : group.member_count;

    const details = (
        <Text style={styles.rowUsername}>
            {`@${group?.name}`}
            {' • '}
            {intl.formatMessage({id: 'mobile.user_list.user_group_item.group_members', defaultMessage: '{count} members'}, {count: memberCount})}
        </Text>
    );

    return (
        <TouchableOpacity
            onPress={onPress}
            onLongPress={onLongPress}
            disabled={!(onGroupPress || onGroupLongPress)}
            onLayout={onLayout}
        >
            <View
                ref={viewRef}
                style={[styles.row, containerStyle]}
                testID={userGroupItemTestId}
            >
                <View
                    testID={`${userGroupItemTestId}.icon`}
                    style={styles.iconContainer}
                >
                    <CompassIcon
                        name='account-multiple-outline'
                        style={styles.icon}
                        size={size}
                    />
                </View>
                <View style={nonThemedStyles.rowInfoBaseContainer}>
                    <View style={nonThemedStyles.rowInfoContainer}>
                        <Text
                            style={styles.rowFullname}
                            numberOfLines={1}
                            testID={`${userGroupItemTestId}.display_name`}
                        >
                            {nonBreakingString('displayName' in group ? group.displayName : group.display_name)}
                            {!footer && spacing !== 'spacious' && details}
                        </Text>
                    </View>
                    {footer ?? (spacing === 'spacious' && <View style={nonThemedStyles.details}>{details}</View>)}
                </View>
                {Boolean(rightDecorator) && <View style={nonThemedStyles.rightContainer}>{rightDecorator}</View>}
            </View>
        </TouchableOpacity>
    );
};

export default UserGroupItem;
