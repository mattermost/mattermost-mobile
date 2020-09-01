// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Image, Text, View} from 'react-native';
import IonIcon from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

export default class NoResults extends PureComponent {
    static propTypes = {
        description: PropTypes.string,
        iconName: PropTypes.string,
        iconType: PropTypes.oneOf(['' /* image */, 'ion', 'material-community']),
        image: PropTypes.oneOfType([PropTypes.object, PropTypes.number]),
        theme: PropTypes.object.isRequired,
        title: PropTypes.string.isRequired,
    };

    render() {
        const {
            description,
            iconName,
            iconType,
            image,
            theme,
            title,
        } = this.props;
        const style = getStyleFromTheme(theme);

        let icon;
        if (image) {
            icon = (
                <Image
                    source={image}
                    style={{width: 37, height: 37, tintColor: changeOpacity(theme.centerChannelColor, 0.5)}}
                />
            );
        } else if (iconName) {
            if (iconType === 'ion') {
                icon = (
                    <IonIcon
                        size={72}
                        name={iconName}
                        style={style.icon}
                    />
                );
            } else if (iconType === 'material-community') {
                icon = (
                    <MaterialCommunityIcons
                        size={72}
                        name={iconName}
                        style={style.icon}
                    />
                );
            }
        }

        return (
            <View style={style.container}>
                <View style={style.iconContainer}>
                    {icon}
                </View>
                <Text style={style.title}>{title}</Text>
                {description &&
                <Text style={style.description}>{description}</Text>
                }
            </View>
        );
    }
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            alignItems: 'center',
            flex: 1,
            justifyContent: 'center',
            marginLeft: 32,
            marginRight: 32,
            marginBottom: 40,
        },
        title: {
            color: changeOpacity(theme.centerChannelColor, 1),
            fontSize: 20,
            fontWeight: '600',
            marginVertical: 15,
        },
        description: {
            color: changeOpacity(theme.centerChannelColor, 1),
            fontSize: 16,
            textAlign: 'center',
            lineHeight: 24,
        },
        icon: {
            color: theme.buttonBg,
        },
        iconContainer: {
            height: 120,
            width: 120,
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: 60,
            marginBottom: 4,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
        },
    };
});
