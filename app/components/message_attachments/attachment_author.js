// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import {Alert, Linking, Text, View} from 'react-native';
import FastImage from 'react-native-fast-image';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';

import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

export default class AttachmentAuthor extends PureComponent {
    static propTypes = {
        icon: PropTypes.string,
        link: PropTypes.string,
        name: PropTypes.string,
        theme: PropTypes.object.isRequired,
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    openLink = () => {
        const {link} = this.props;
        const {intl} = this.context;

        if (link) {
            Linking.openURL(link).catch(() => {
                Alert.alert(
                    intl.formatMessage({
                        id: 'mobile.link.error.title',
                        defaultMessage: 'Error',
                    }),
                    intl.formatMessage({
                        id: 'mobile.link.error.text',
                        defaultMessage: 'Unable to open the link.',
                    }),
                );
            });
        }
    };

    render() {
        const {
            icon,
            link,
            name,
            theme,
        } = this.props;

        if (!icon && !name) {
            return null;
        }

        const style = getStyleSheet(theme);

        return (
            <View style={style.container}>
                {Boolean(icon) &&
                <FastImage
                    source={{uri: icon}}
                    key='author_icon'
                    style={style.icon}
                />
                }
                {Boolean(name) &&
                <Text
                    key='author_name'
                    style={[style.name, Boolean(link) && style.link]}
                    onPress={this.openLink}
                >
                    {name}
                </Text>
                }
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
            flexDirection: 'row',
        },
        name: {
            color: changeOpacity(theme.centerChannelColor, 0.5),
            fontSize: 11,
        },
        icon: {
            height: 12,
            marginRight: 3,
            width: 12,
        },
        link: {
            color: changeOpacity(theme.linkColor, 0.5),
        },
    };
});
