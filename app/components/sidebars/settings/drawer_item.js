// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {TouchableOpacity, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

export default class DrawerItem extends PureComponent {
    static propTypes = {
        testID: PropTypes.string,
        centered: PropTypes.bool,
        defaultMessage: PropTypes.string,
        i18nId: PropTypes.string,
        iconName: PropTypes.string,
        isDestructor: PropTypes.bool,
        labelComponent: PropTypes.node,
        labelSibling: PropTypes.node,
        failureText: PropTypes.node,
        leftComponent: PropTypes.node,
        onPress: PropTypes.func,
        separator: PropTypes.bool,
        theme: PropTypes.object.isRequired,
    };

    static defaultProps = {
        defaultMessage: '',
        isDestructor: false,
        separator: true,
    };

    render() {
        const {
            testID,
            centered,
            defaultMessage,
            i18nId,
            iconName,
            isDestructor,
            labelComponent,
            leftComponent,
            onPress,
            separator,
            theme,
            labelSibling,
            failureText,
        } = this.props;
        const style = getStyleSheet(theme);

        const destructor = {};
        if (isDestructor) {
            destructor.color = theme.errorTextColor;
        }

        let divider;
        if (separator) {
            divider = (<View style={style.divider}/>);
        }

        let icon;
        if (leftComponent) {
            icon = leftComponent;
        } else if (iconName) {
            icon = (
                <CompassIcon
                    name={iconName}
                    style={[style.icon, destructor]}
                />
            );
        }

        let label;
        if (labelComponent) {
            label = labelComponent;
        } else if (i18nId) {
            label = (
                <FormattedText
                    id={i18nId}
                    defaultMessage={defaultMessage}
                    style={[style.label, destructor, centered ? style.centerLabel : {}]}
                />
            );
        }

        return (
            <TouchableOpacity
                testID={testID}
                onPress={onPress}
            >
                <View style={style.container}>
                    {icon && (
                        <View style={style.iconContainer}>
                            {icon}
                        </View>
                    )}
                    <View style={style.wrapper}>
                        <View style={style.labelContainer}>
                            {label}
                        </View>
                        {labelSibling && (
                            <View style={style.labelSiblingContainer}>
                                {labelSibling}
                            </View>
                        )}
                        {failureText}
                        {divider}
                    </View>
                </View>
            </TouchableOpacity>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            backgroundColor: theme.centerChannelBg,
            flexDirection: 'row',
            padding: 3,
        },
        iconContainer: {
            width: 45,
            height: 50,
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: 5,
        },
        icon: {
            color: changeOpacity(theme.centerChannelColor, 0.64),
            fontSize: 24,
        },
        wrapper: {
            flex: 1,
            position: 'relative',
        },
        labelContainer: {
            alignItems: 'center',
            width: '70%',
            flex: 1,
            flexDirection: 'row',
        },
        labelSiblingContainer: {
            position: 'absolute',
            top: 3,
            right: 14,
        },
        centerLabel: {
            textAlign: 'center',
            textAlignVertical: 'center',
        },
        label: {
            color: changeOpacity(theme.centerChannelColor, 0.5),
            flex: 1,
            fontSize: 17,
            textAlignVertical: 'center',
            includeFontPadding: false,
        },
        divider: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.2),
            height: 1,
        },
    };
});
