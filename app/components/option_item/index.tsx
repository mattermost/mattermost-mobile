// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {type LayoutChangeEvent, Platform, type StyleProp, Switch, Text, type TextStyle, TouchableOpacity, View, type ViewStyle} from 'react-native';

import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import OptionIcon from './option_icon';
import RadioItem, {type RadioItemProps} from './radio_item';

const TouchableOptionTypes = {
    ARROW: 'arrow',
    DEFAULT: 'default',
    RADIO: 'radio',
    REMOVE: 'remove',
    SELECT: 'select',
};

const OptionType = {
    NONE: 'none',
    TOGGLE: 'toggle',
    ...TouchableOptionTypes,
} as const;

export type OptionType = typeof OptionType[keyof typeof OptionType];

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
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            marginLeft: 16,
        },
        actionSubContainer: {
            marginLeft: 'auto',
        },
        container: {
            flexDirection: 'row',
            alignItems: 'center',
            minHeight: ITEM_HEIGHT,
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
            flex: 1,
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
            flexDirection: 'row',
            alignItems: 'center',
        },
        labelText: {
            color: theme.centerChannelColor,
            ...typography('Body', 200),
        },
        removeContainer: {
            flex: 1,
            alignItems: 'flex-end',
            color: theme.centerChannelColor,
            marginRight: 20,
            ...typography('Body', 200),
        },
        row: {
            flex: 3,
            flexDirection: 'row',
        },
    };
});

export type OptionItemProps = {
    action?: (React.Dispatch<React.SetStateAction<string | boolean>>)|((value: string | boolean) => void);
    arrowStyle?: StyleProp<ViewStyle>;
    containerStyle?: StyleProp<ViewStyle>;
    description?: string;
    destructive?: boolean;
    icon?: string;
    iconColor?: string;
    info?: string;
    inline?: boolean;
    label: string;
    labelContainerStyle?: StyleProp<ViewStyle>;
    onRemove?: () => void;
    optionDescriptionTextStyle?: StyleProp<TextStyle>;
    optionLabelTextStyle?: StyleProp<TextStyle>;
    radioItemProps?: Partial<RadioItemProps>;
    selected?: boolean;
    testID?: string;
    type: OptionType;
    value?: string;
    onLayout?: (event: LayoutChangeEvent) => void;
    descriptionNumberOfLines?: number;
}

const OptionItem = ({
    action,
    arrowStyle,
    containerStyle,
    description,
    destructive,
    icon,
    iconColor,
    info,
    inline = false,
    label,
    labelContainerStyle,
    onRemove,
    optionDescriptionTextStyle,
    optionLabelTextStyle,
    radioItemProps,
    selected,
    testID = 'optionItem',
    type,
    value,
    onLayout,
    descriptionNumberOfLines,
}: OptionItemProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const isInLine = inline && Boolean(description);

    const labelStyle = useMemo(() => {
        return isInLine ? styles.inlineLabel : styles.label;
    }, [inline, styles, isInLine]);

    const labelTextStyle = useMemo(() => {
        return [
            isInLine ? styles.inlineLabelText : styles.labelText,
            destructive && styles.destructive,
        ];
    }, [destructive, styles, isInLine]);

    const descriptionTextStyle = useMemo(() => {
        return [
            isInLine ? styles.inlineDescription : styles.description,
            destructive && styles.destructive,
        ];
    }, [destructive, styles, isInLine]);

    let actionComponent;
    let radioComponent;
    if (type === OptionType.SELECT && selected) {
        actionComponent = (
            <CompassIcon
                color={theme.linkColor}
                name='check'
                size={24}
                testID={`${testID}.selected`}
            />
        );
    } else if (type === OptionType.RADIO) {
        const radioComponentTestId = selected ? `${testID}.selected` : `${testID}.not_selected`;
        radioComponent = (
            <RadioItem
                selected={Boolean(selected)}
                {...radioItemProps}
                testID={radioComponentTestId}
            />
        );
    } else if (type === OptionType.TOGGLE) {
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
                testID={`${testID}.toggled.${selected}`}
            />
        );
    } else if (type === OptionType.ARROW) {
        actionComponent = (
            <CompassIcon
                color={changeOpacity(theme.centerChannelColor, 0.32)}
                name='chevron-right'
                size={24}
                style={arrowStyle}
            />
        );
    } else if (type === OptionType.REMOVE) {
        actionComponent = (
            <TouchableWithFeedback
                hitSlop={hitSlop}
                onPress={onRemove}
                style={[styles.iconContainer]}
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

    const component = (
        <View
            testID={testID}
            style={[styles.container, containerStyle]}
            onLayout={onLayout}
        >
            <View style={styles.row}>
                <View style={[styles.labelContainer, labelContainerStyle]}>
                    {Boolean(icon) && (
                        <View style={styles.iconContainer}>
                            <OptionIcon
                                icon={icon!}
                                iconColor={iconColor}
                                destructive={destructive}
                            />
                        </View>
                    )}
                    {type === OptionType.RADIO && radioComponent}
                    <View style={labelStyle}>
                        <Text
                            style={[labelTextStyle, optionLabelTextStyle]}
                            testID={`${testID}.label`}
                            numberOfLines={1}
                        >
                            {label}
                        </Text>
                        {Boolean(description) &&
                        <Text
                            style={[descriptionTextStyle, optionDescriptionTextStyle]}
                            testID={`${testID}.description`}
                            numberOfLines={descriptionNumberOfLines}
                        >
                            {description}
                        </Text>
                        }
                    </View>
                </View>
            </View>
            {Boolean(actionComponent || info) &&
            <View style={styles.actionContainer}>
                {
                    Boolean(info) &&
                    <Text
                        style={[styles.info, !actionComponent && styles.iconContainer, destructive && {color: theme.dndIndicator}]}
                        testID={`${testID}.info`}
                        numberOfLines={1}
                    >
                        {info}
                    </Text>
                }
                <View style={styles.actionSubContainer}>
                    {actionComponent}
                </View>
            </View>
            }
        </View>
    );
    if (Object.values(TouchableOptionTypes).includes(type)) {
        return (
            <TouchableOpacity onPress={onPress}>
                {component}
            </TouchableOpacity>
        );
    }

    return component;
};

export default OptionItem;
