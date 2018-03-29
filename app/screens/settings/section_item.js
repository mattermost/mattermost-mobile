// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import {
    Switch,
    TouchableOpacity,
    View,
} from 'react-native';
import FontAwesomeIcon from 'react-native-vector-icons/FontAwesome';

import CheckMark from 'app/components/checkmark';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

const ActionTypes = {
    ARROW: 'arrow',
    DEFAULT: 'default',
    TOGGLE: 'toggle',
    SELECT: 'select',
};

function sectionItem(props) {
    const {
        action,
        actionType,
        actionValue,
        label,
        theme,
        selected,
        description,
    } = props;

    const style = getStyleSheet(theme);

    let actionComponent;
    if (actionType === ActionTypes.SELECT && selected) {
        actionComponent = (
            <CheckMark
                width={12}
                height={12}
                color={theme.linkColor}
            />
        );
    } else if (actionType === ActionTypes.TOGGLE) {
        actionComponent = (
            <Switch
                onValueChange={action}
                value={selected}
            />
        );
    } else if (actionType === ActionTypes.ARROW) {
        actionComponent = (
            <FontAwesomeIcon
                name='angle-right'
                style={style.arrow}
            />
        );
    }

    const labelComponent = React.cloneElement(
        label,
        {style: style.label}
    );

    let descriptionComponent;
    if (description) {
        descriptionComponent = React.cloneElement(
            description,
            {style: style.description}
        );
    }

    const component = (
        <View style={style.container}>
            <View style={description ? style.doubleContainer : style.singleContainer}>
                {labelComponent}
                {descriptionComponent}
            </View>
            {actionComponent}
        </View>
    );

    if (actionType === ActionTypes.DEFAULT || actionType === ActionTypes.SELECT || actionType === ActionTypes.ARROW) {
        return (
            <TouchableOpacity onPress={() => action(actionValue)}>
                {component}
            </TouchableOpacity>
        );
    }

    return component;
}

sectionItem.propTypes = {
    action: PropTypes.func,
    actionType: PropTypes.oneOf([ActionTypes.ARROW, ActionTypes.DEFAULT, ActionTypes.TOGGLE, ActionTypes.SELECT]),
    actionValue: PropTypes.string,
    label: PropTypes.node.isRequired,
    selected: PropTypes.bool,
    theme: PropTypes.object.isRequired,
    description: PropTypes.node,
};

sectionItem.defaultProps = {
    action: () => true,
    actionType: ActionTypes.DEFAULT,
};

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 15,
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
            fontSize: 15,
        },
        description: {
            color: changeOpacity(theme.centerChannelColor, 0.6),
            fontSize: 14,
            marginTop: 3,
        },
        arrow: {
            color: changeOpacity(theme.centerChannelColor, 0.25),
            fontSize: 24,
        },
    };
});

export default sectionItem;
