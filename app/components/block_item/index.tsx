// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {ReactElement, useCallback, useMemo} from 'react';
import {StyleProp, Switch, Text, TextStyle, TouchableOpacity, View, ViewStyle} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const ActionTypes = {
    ARROW: 'arrow',
    DEFAULT: 'default',
    TOGGLE: 'toggle',
    SELECT: 'select',
};

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        singleContainer: {
            alignItems: 'center',
            flex: 1,
            flexDirection: 'row',
            height: 45,
        },
        doubleContainer: {
            flex: 1,
            flexDirection: 'column',
            height: 69,
            justifyContent: 'center',
        },
        label: {
            color: theme.centerChannelColor,
            ...typography('Body', 200, 'SemiBold'),
            marginLeft: 9,
        },
        description: {
            color: changeOpacity(theme.centerChannelColor, 0.6),
            ...typography('Body', 75, 'Regular'),
            marginTop: 3,
        },
        arrow: {
            color: changeOpacity(theme.centerChannelColor, 0.25),
            fontSize: 24,
        },
        labelContainer: {
            flex: 0,
            flexDirection: 'row',
        },
    };
});

type Props = {
    action: (value: string | boolean) => void;
    actionType: string;
    actionValue?: string;
    containerStyle?: StyleProp<ViewStyle>;
    description?: string | ReactElement;
    descriptionStyle?: StyleProp<TextStyle>;
    icon?: string;
    label: string | ReactElement;
    labelStyle?: StyleProp<TextStyle>;
    selected?: boolean;
    testID?: string;
}

const BlockItem = ({
    action,
    actionType,
    actionValue,
    containerStyle,
    description,
    descriptionStyle,
    icon,
    label,
    labelStyle,
    selected,
    testID = 'sectionItem',
}: Props) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);

    let actionComponent;
    if (actionType === ActionTypes.SELECT && selected) {
        const selectStyle = [style.arrow, {color: theme.linkColor}];
        actionComponent = (
            <CompassIcon
                name='check'
                style={selectStyle}
                testID={`${testID}.selected`}
            />
        );
    } else if (actionType === ActionTypes.TOGGLE) {
        actionComponent = (
            <Switch
                onValueChange={action}
                value={selected}
                testID={`${testID}.toggled.${selected}`}
            />
        );
    } else if (actionType === ActionTypes.ARROW) {
        actionComponent = (
            <CompassIcon
                name='chevron-right'
                style={style.arrow}
            />
        );
    }

    const onPress = useCallback(() => {
        action(actionValue || '');
    }, [actionValue, action]);

    const labelStyles = useMemo(() => {
        if (icon) {
            return [style.label, {marginLeft: 4}];
        }
        return [style.label, labelStyle];
    }, [Boolean(icon), style]);

    const component = (
        <View
            testID={testID}
            style={[style.container, containerStyle]}
        >
            <View style={description ? style.doubleContainer : style.singleContainer}>
                <View style={style.labelContainer}>
                    {Boolean(icon) && (
                        <CompassIcon
                            name={icon!}
                            size={24}
                            color={changeOpacity(theme.centerChannelColor, 0.6)}
                        />
                    )}
                    <Text
                        style={labelStyles}
                        testID={`${testID}.label`}
                    >
                        {label}
                    </Text>
                </View>
                <Text
                    style={[style.description, descriptionStyle]}
                    testID={`${testID}.description`}
                >
                    {description}
                </Text>
            </View>
            {actionComponent}
        </View>
    );

    if (actionType === ActionTypes.DEFAULT || actionType === ActionTypes.SELECT || actionType === ActionTypes.ARROW) {
        return (
            <TouchableOpacity onPress={onPress}>
                {component}
            </TouchableOpacity>
        );
    }

    return component;
};

export default BlockItem;
