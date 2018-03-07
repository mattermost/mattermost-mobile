// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {TouchableOpacity, View} from 'react-native';

import FormattedText from 'app/components/formatted_text';
import VectorIcon from 'app/components/vector_icon.js';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

export default class DrawerItem extends PureComponent {
    static propTypes = {
        centered: PropTypes.bool,
        defaultMessage: PropTypes.string,
        i18nId: PropTypes.string,
        iconName: PropTypes.string,
        iconType: PropTypes.oneOf(['fontawesome', 'foundation', 'ion', 'material']),
        isDestructor: PropTypes.bool,
        labelComponent: PropTypes.node,
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
            centered,
            defaultMessage,
            i18nId,
            iconName,
            iconType,
            isDestructor,
            labelComponent,
            leftComponent,
            onPress,
            separator,
            theme,
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
        } else if (iconType && iconName) {
            icon = (
                <VectorIcon
                    name={iconName}
                    type={iconType}
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
                onPress={onPress}
            >
                <View style={style.container}>
                    {icon &&
                    <View style={style.iconContainer}>
                        {icon}
                    </View>
                    }
                    <View style={style.wrapper}>
                        <View style={style.labelContainer}>
                            {label}
                        </View>
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
            alignItems: 'center',
            backgroundColor: theme.centerChannelBg,
            flexDirection: 'row',
            height: 50,
        },
        iconContainer: {
            width: 45,
            height: 50,
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: 5,
        },
        icon: {
            color: theme.linkColor,
            fontSize: 22,
        },
        wrapper: {
            flex: 1,
        },
        labelContainer: {
            alignItems: 'center',
            flex: 1,
            flexDirection: 'row',
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
