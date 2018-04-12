// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Text, View} from 'react-native';

import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

export default class NoResults extends PureComponent {
    static propTypes = {
        description: PropTypes.string,
        icon: PropTypes.node,
        theme: PropTypes.object.isRequired,
        title: PropTypes.string.isRequired,
    };

    render() {
        const {
            description,
            icon,
            theme,
            title,
        } = this.props;
        const style = getStyleFromTheme(theme);

        return (
            <View style={style.container}>
                {icon}
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
            color: changeOpacity(theme.centerChannelColor, 0.4),
            fontSize: 20,
            fontWeight: '600',
            marginBottom: 15,
        },
        description: {
            color: changeOpacity(theme.centerChannelColor, 0.4),
            fontSize: 17,
            textAlign: 'center',
        },
    };
});
