// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

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
            ...typography('Body', 600, 'SemiBold'),
            fontSize: 16,
            lineHeight: 24,
        },
        description: {
            color: changeOpacity(theme.centerChannelColor, 0.6),
            ...typography('Body', 400, 'Regular'),
            fontSize: 12,
            lineHeight: 16,
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
    testID?: string;
    action: (value: string | boolean) => void;
    actionType: string;
    actionValue?: string;
    label: string;
    selected: boolean;
    description: string;
    icon?: string;
}

const SectionItem = ({testID = 'sectionItem', action, actionType, actionValue, label, selected, description, icon}: Props) => {
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

    const labelStyle = useMemo(() => {
        if (icon) {
            return [style.label, {marginLeft: 4}];
        }
        return style.label;
    }, [Boolean(icon), style]);

    const component = (
        <View
            testID={testID}
            style={style.container}
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
                        style={labelStyle}
                        testID={`${testID}.label`}
                    >
                        {label}
                    </Text>
                </View>
                <Text
                    style={style.description}
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

export default SectionItem;
