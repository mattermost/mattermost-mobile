// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import {
    StyleSheet,
    Switch,
    TouchableWithoutFeedback,
    View
} from 'react-native';

import FormattedText from 'app/components/formatted_text';
import {makeStyleSheetFromTheme} from 'app/utils/theme';
import CheckMark from 'app/components/checkmark';

const ActionTypes = {
    DEFAULT: 'default',
    TOGGLE: 'toggle',
    SELECT: 'select'
};

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return StyleSheet.create({
        container: {
            flexDirection: 'row',
            alignItems: 'center'
        },
        label: {
            flex: 1,
            fontSize: 12,
            color: theme.centerChannelColor,
            paddingVertical: 15
        },
        wrapper: {
            paddingHorizontal: 15
        }
    });
});

function sectionItem(props) {
    const {
        action,
        actionType,
        actionValue,
        children,
        labelDefaultMessage,
        labelId,
        labelValues,
        theme,
        selected
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
    }

    const component = (
        <View style={style.wrapper}>
            <View style={style.container}>
                <FormattedText
                    id={labelId}
                    defaultMessage={labelDefaultMessage}
                    values={labelValues}
                    style={[style.label, (children && {paddingBottom: 5})]}
                />
                {actionComponent}
            </View>
            {children}
        </View>
    );

    if (actionType === ActionTypes.DEFAULT || actionType === ActionTypes.SELECT) {
        return (
            <TouchableWithoutFeedback onPress={() => action(actionValue)}>
                {component}
            </TouchableWithoutFeedback>
        );
    }

    return component;
}

sectionItem.propTypes = {
    action: PropTypes.func,
    actionType: PropTypes.oneOf([ActionTypes.DEFAULT, ActionTypes.TOGGLE, ActionTypes.SELECT]),
    actionValue: PropTypes.string,
    children: PropTypes.node,
    labelDefaultMessage: PropTypes.string.isRequired,
    labelId: PropTypes.string.isRequired,
    labelValues: PropTypes.object,
    selected: PropTypes.bool,
    theme: PropTypes.object.isRequired
};

sectionItem.defaultProps = {
    actionType: ActionTypes.DEFAULT
};

export default sectionItem;
