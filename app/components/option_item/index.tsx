// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {Switch, Text, TouchableOpacity, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    action: (value: string | boolean) => void;
    description?: string;
    destructive?: boolean;
    icon?: string;
    info?: string;
    label: string;
    selected?: boolean;
    testID?: string;
    type: OptionType;
    value?: string;
}

const OptionType = {
    ARROW: 'arrow',
    DEFAULT: 'default',
    TOGGLE: 'toggle',
    SELECT: 'select',
} as const;

type OptionType = typeof OptionType[keyof typeof OptionType];

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        actionContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            marginLeft: 16,
        },
        container: {
            flexDirection: 'row',
            alignItems: 'center',
            minHeight: 48,
        },
        destructive: {
            color: theme.dndIndicator,
        },
        description: {
            color: changeOpacity(theme.centerChannelColor, 0.64),
            ...typography('Body', 75),
            marginTop: 2,
        },
        iconContainer: {marginRight: 16},
        infoContainer: {marginRight: 2},
        info: {
            color: changeOpacity(theme.centerChannelColor, 0.56),
            ...typography('Body', 100),
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
        row: {
            flex: 1,
            flexDirection: 'row',
        },
    };
});

const OptionItem = ({
    action, description, destructive, icon,
    info, label, selected,
    testID = 'optionItem', type, value,
}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    let actionComponent;
    if (type === OptionType.SELECT && selected) {
        actionComponent = (
            <CompassIcon
                color={theme.linkColor}
                name='check'
                size={24}
                testID={`${testID}.selected`}
            />
        );
    } else if (type === OptionType.TOGGLE) {
        actionComponent = (
            <Switch
                onValueChange={action}
                value={selected}
                testID={`${testID}.toggled.${selected}`}
            />
        );
    } else if (type === OptionType.ARROW) {
        actionComponent = (
            <CompassIcon
                color={changeOpacity(theme.centerChannelColor, 0.32)}
                name='chevron-right'
                size={24}
            />
        );
    }

    const onPress = useCallback(() => {
        action(value || '');
    }, [value, action]);

    const component = (
        <View
            testID={testID}
            style={styles.container}
        >
            <View style={styles.row}>
                <View style={styles.labelContainer}>
                    {Boolean(icon) && (
                        <View style={styles.iconContainer}>
                            <CompassIcon
                                name={icon!}
                                size={24}
                                color={destructive ? theme.dndIndicator : changeOpacity(theme.centerChannelColor, 0.64)}
                            />
                        </View>
                    )}
                    <View style={styles.label}>
                        <Text
                            style={[styles.labelText, destructive && styles.destructive]}
                            testID={`${testID}.label`}
                        >
                            {label}
                        </Text>
                        {Boolean(description) &&
                        <Text
                            style={[styles.description, destructive && styles.destructive]}
                            testID={`${testID}.description`}
                        >
                            {description}
                        </Text>
                        }
                    </View>
                </View>
            </View>
            {Boolean(actionComponent || info) &&
            <View style={styles.actionContainer}>
                {Boolean(info) &&
                <View style={styles.infoContainer}>
                    <Text style={styles.info}>{info}</Text>
                </View>
                }
                {actionComponent}
            </View>
            }
        </View>
    );

    if (type === OptionType.DEFAULT || type === OptionType.SELECT || type === OptionType.ARROW) {
        return (
            <TouchableOpacity onPress={onPress}>
                {component}
            </TouchableOpacity>
        );
    }

    return component;
};

export default OptionItem;
