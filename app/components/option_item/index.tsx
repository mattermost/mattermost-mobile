// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {type LayoutChangeEvent, Platform, Switch, Text, TouchableOpacity, View} from 'react-native';

import UserChip from '@components/chips/user_chip';
import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import OptionIcon from './option_icon';
import RadioItem from './radio_item';

import type UserModel from '@typings/database/models/servers/user';

const TouchableOptionTypes = {
    ARROW: 'arrow',
    DEFAULT: 'default',
    RADIO: 'radio',
    REMOVE: 'remove',
    SELECT: 'select',
    LINK: 'link',
} as const;

const OptionTypeConst = {
    NONE: 'none',
    TOGGLE: 'toggle',
    ...TouchableOptionTypes,
} as const;

export type OptionType = typeof OptionTypeConst[keyof typeof OptionTypeConst];

export const ITEM_HEIGHT = 48;
const DESCRIPTION_MARGIN_TOP = 2;

export function getItemHeightWithDescription(descriptionNumberOfLines: number) {
    const labelHeight = 24; // typography 200 line height
    const descriptionLineHeight = 16; // typography 75 line height;

    return Math.max(48, labelHeight + DESCRIPTION_MARGIN_TOP + (descriptionLineHeight * descriptionNumberOfLines));
}

const hitSlop = {top: 11, bottom: 11, left: 11, right: 11};
const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        actionContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-end',
        },
        container: {
            flexDirection: 'row',
            alignItems: 'center',
            minHeight: ITEM_HEIGHT,
            gap: 12,
            justifyContent: 'space-between',
        },
        destructive: {
            color: theme.dndIndicator,
        },
        description: {
            color: changeOpacity(theme.centerChannelColor, 0.64),
            ...typography('Body', 75),
            marginTop: DESCRIPTION_MARGIN_TOP,
        },
        iconContainer: {marginRight: 16},
        info: {
            textAlign: 'right',
            color: changeOpacity(theme.centerChannelColor, 0.56),
            ...typography('Body', 100),
        },
        inlineLabel: {
            flexDirection: 'row',
            flexShrink: 1,
            justifyContent: 'center',
        },
        inlineLabelText: {
            color: theme.centerChannelColor,
            ...typography('Body', 200, 'SemiBold'),
        },
        inlineDescription: {
            color: theme.centerChannelColor,
            ...typography('Body', 200),
        },
        label: {
            flexShrink: 1,
            justifyContent: 'center',
        },
        labelContainer: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
        },
        labelText: {
            color: theme.centerChannelColor,
            ...typography('Body', 200),
        },
        shrink: {
            flexShrink: 1,
        },
    };
});

type UserChipData = {
    user: UserModel;
    onPress: (id: string) => void;
    teammateNameDisplay: string;
}

export type OptionItemProps = {
    action?: (React.Dispatch<React.SetStateAction<string | boolean>>)|((value: string | boolean) => void);
    description?: string;
    destructive?: boolean;
    icon?: string;
    iconColor?: string;
    info?: string | UserChipData;
    inline?: boolean;
    label: string;
    onRemove?: () => void;
    selected?: boolean;
    testID?: string;
    type: OptionType;
    value?: string;
    onLayout?: (event: LayoutChangeEvent) => void;
    descriptionNumberOfLines?: number;
    longInfo?: boolean;
    nonDestructiveDescription?: boolean;
    isRadioCheckmark?: boolean;
}

const OptionItem = ({
    action,
    description,
    destructive,
    icon,
    iconColor,
    info,
    inline = false,
    label,
    onRemove,
    selected,
    testID = 'optionItem',
    type,
    value,
    onLayout,
    descriptionNumberOfLines,
    longInfo,
    nonDestructiveDescription = false,
    isRadioCheckmark = false,
}: OptionItemProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const isInLine = inline && Boolean(description);
    const shouldDescriptionShowDestructive = destructive && !nonDestructiveDescription;

    const labelContainerStyle = useMemo(() => {
        const extraStyle = longInfo ? {flex: undefined} : {};
        return [styles.labelContainer, extraStyle];
    }, [longInfo, styles.labelContainer]);

    const labelStyle = useMemo(() => {
        return isInLine ? styles.inlineLabel : styles.label;
    }, [styles, isInLine]);

    const labelTextStyle = useMemo(() => {
        return [
            isInLine ? styles.inlineLabelText : styles.labelText,
            destructive && styles.destructive,
            type === 'link' && {color: theme.linkColor},
        ];
    }, [destructive, styles, isInLine, type, theme.linkColor]);

    const descriptionTextStyle = useMemo(() => {
        return [
            isInLine ? styles.inlineDescription : styles.description,
            shouldDescriptionShowDestructive && styles.destructive,
        ];
    }, [
        isInLine,
        styles.inlineDescription,
        styles.description,
        styles.destructive,
        shouldDescriptionShowDestructive,
    ]);

    const actionContainerStyle = useMemo(() => {
        const extraStyle = longInfo ? styles.shrink : {};
        return [styles.actionContainer, extraStyle];
    }, [longInfo, styles.actionContainer, styles.shrink]);

    let actionComponent;
    let radioComponent;
    if (type === OptionTypeConst.SELECT && selected) {
        actionComponent = (
            <CompassIcon
                color={theme.linkColor}
                name='check'
                size={24}
                testID={`${testID}.selected`}
            />
        );
    } else if (type === OptionTypeConst.RADIO) {
        const radioComponentTestId = selected ? `${testID}.selected` : `${testID}.not_selected`;
        radioComponent = (
            <RadioItem
                selected={Boolean(selected)}
                testID={radioComponentTestId}
                checkedBody={isRadioCheckmark}
            />
        );
    } else if (type === OptionTypeConst.TOGGLE) {
        const trackColor = Platform.select({
            ios: {true: theme.buttonBg, false: changeOpacity(theme.centerChannelColor, 0.16)},
            default: {true: changeOpacity(theme.buttonBg, 0.32), false: changeOpacity(theme.centerChannelColor, 0.24)},
        });
        const thumbColor = Platform.select({
            android: selected ? theme.buttonBg : '#F3F3F3', // Hardcoded color specified in ticket MM-45143
        });
        actionComponent = (
            <Switch
                onValueChange={action}
                value={selected}
                trackColor={trackColor}
                thumbColor={thumbColor}
                testID={`${testID}.toggled.${selected}.button`}
            />
        );
    } else if (type === OptionTypeConst.ARROW) {
        actionComponent = (
            <CompassIcon
                color={changeOpacity(theme.centerChannelColor, 0.32)}
                name='chevron-right'
                size={24}
                testID={`${testID}.arrow.icon`}
            />
        );
    } else if (type === OptionTypeConst.REMOVE) {
        actionComponent = (
            <TouchableWithFeedback
                hitSlop={hitSlop}
                onPress={onRemove}
                style={styles.iconContainer}
                type='opacity'
                testID={`${testID}.remove.button`}
            >
                <CompassIcon
                    name={'close'}
                    size={18}
                    color={changeOpacity(theme.centerChannelColor, 0.64)}
                />
            </TouchableWithFeedback>
        );
    }

    const onPress = useCallback(() => {
        action?.(value || '');
    }, [value, action]);

    let infoComponent;
    if (typeof info === 'object') {
        infoComponent = (
            <View style={actionComponent ? undefined : styles.iconContainer}>
                <UserChip
                    user={info.user}
                    onPress={info.onPress}
                    teammateNameDisplay={info.teammateNameDisplay}
                />
            </View>
        );
    } else if (info) {
        infoComponent = (
            <Text
                style={[styles.info, !actionComponent && styles.iconContainer, destructive && {color: theme.dndIndicator}]}
                testID={`${testID}.info`}
                numberOfLines={1}
            >
                {info}
            </Text>
        );
        if (actionComponent) {
            // Wrap the text into another view to properly calculate
            // the space available.
            infoComponent = (
                <View style={styles.shrink}>
                    {infoComponent}
                </View>
            );
        }
    }

    const component = (
        <View
            testID={testID}
            style={styles.container}
            onLayout={onLayout}
        >
            <View style={labelContainerStyle}>
                {Boolean(icon) && (
                    <View style={styles.iconContainer}>
                        <OptionIcon
                            icon={icon!}
                            iconColor={iconColor}
                            destructive={destructive}
                        />
                    </View>
                )}
                {type === OptionTypeConst.RADIO && radioComponent}
                <View style={labelStyle}>
                    <Text
                        style={labelTextStyle}
                        testID={`${testID}.label`}
                        numberOfLines={1}
                    >
                        {label}
                    </Text>
                    {Boolean(description) &&
                    <Text
                        style={descriptionTextStyle}
                        testID={`${testID}.description`}
                        numberOfLines={descriptionNumberOfLines}
                    >
                        {description}
                    </Text>
                    }
                </View>
            </View>
            {Boolean(actionComponent || infoComponent) &&
            <View style={actionContainerStyle}>
                {infoComponent}
                {actionComponent}
            </View>
            }
        </View>
    );
    if ((Object.values(TouchableOptionTypes) as string[]).includes(type)) {
        return (
            <TouchableOpacity onPress={onPress}>
                {component}
            </TouchableOpacity>
        );
    }

    return component;
};

export default OptionItem;
