// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import {StyleSheet, TouchableOpacity, View} from 'react-native';
import FontAwesomeIcon from 'react-native-vector-icons/FontAwesome';
import IonIcon from 'react-native-vector-icons/Ionicons';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

import FormattedText from 'app/components/formatted_text';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

export default class SettingsItem extends PureComponent {
    static propTypes = {
        defaultMessage: PropTypes.string.isRequired,
        i18nId: PropTypes.string.isRequired,
        iconName: PropTypes.string.isRequired,
        iconType: PropTypes.oneOf(['fontawesome', 'ion', 'material']).isRequired,
        isDestructor: PropTypes.bool,
        onPress: PropTypes.func,
        separator: PropTypes.bool,
        theme: PropTypes.object.isRequired
    };

    static defaultProps = {
        isDestructor: false,
        separator: true
    };

    render() {
        const {
            defaultMessage,
            i18nId,
            iconName,
            iconType,
            isDestructor,
            onPress,
            separator,
            theme
        } = this.props;
        const style = getStyleSheet(theme);

        const destructor = {};
        if (isDestructor) {
            destructor.color = '#CA3B27';
        }

        let divider;
        if (separator) {
            divider = (<View style={style.divider}/>);
        }

        let icon;
        switch (iconType) {
        case 'fontawesome':
            icon = (
                <FontAwesomeIcon
                    name={iconName}
                    style={[style.icon, destructor]}

                />
            );
            break;
        case 'ion':
            icon = (
                <IonIcon
                    name={iconName}
                    style={[style.icon, destructor]}
                />
            );
            break;
        case 'material':
            icon = (
                <MaterialIcon
                    name={iconName}
                    style={[style.icon, destructor]}
                />
            );
            break;
        }

        return (
            <View style={style.container}>
                <TouchableOpacity
                    onPress={onPress}
                    style={{flex: 1}}
                >
                    <View style={style.wrapper}>
                        {icon}
                        <FormattedText
                            id={i18nId}
                            defaultMessage={defaultMessage}
                            style={[style.label, destructor]}
                        />
                    </View>
                </TouchableOpacity>
                {divider}
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return StyleSheet.create({
        container: {
            backgroundColor: theme.centerChannelBg,
            height: 51,
            flexDirection: 'column',
            justifyContent: 'center'
        },
        wrapper: {
            alignItems: 'center',
            backgroundColor: theme.centerChannelBg,
            flexDirection: 'row',
            height: 50,
            paddingLeft: 16
        },
        icon: {
            color: theme.linkColor,
            fontSize: 20
        },
        label: {
            color: theme.centerChannelColor,
            fontSize: 16,
            fontWeight: '600',
            lineHeight: 19,
            marginLeft: 8
        },
        divider: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            height: 1,
            marginLeft: 16
        }
    });
});
