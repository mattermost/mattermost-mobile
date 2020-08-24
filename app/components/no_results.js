// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Image, Text, View} from 'react-native';
import IonIcon from 'react-native-vector-icons/Ionicons';

import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

export default class NoResults extends PureComponent {
    static propTypes = {
        description: PropTypes.string,
        iconName: PropTypes.string,
        image: PropTypes.oneOfType([PropTypes.object, PropTypes.number]),
        theme: PropTypes.object.isRequired,
        title: PropTypes.string.isRequired,
    };

    render() {
        const {
            description,
            iconName,
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
            icon = (
                <IonIcon
                    size={64}
                    name={iconName}
                    style={style.icon}
                />
            );
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
            paddingHorizontal: 15,
        },
        title: {
            color: changeOpacity(theme.centerChannelColor, 0.8),
            fontSize: 20,
            fontWeight: 'bold',
            marginVertical: 15,
        },
        description: {
            color: changeOpacity(theme.centerChannelColor, 0.8),
            fontSize: 17,
            textAlign: 'center',
        },
        icon: {
            color: theme.linkColor,
        },
        iconContainer: {
            textAlign: 'center',
            borderRadius: 64,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            padding: 20,
        },
    };
});
