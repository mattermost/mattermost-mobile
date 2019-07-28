// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {View} from 'react-native';

import FormattedText from 'app/components/formatted_text';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';
import {t} from 'app/utils/i18n';

import Cloud from './cloud';

export default class FailedNetworkAction extends PureComponent {
    static propTypes = {
        onRetry: PropTypes.func,
        theme: PropTypes.object.isRequired,
    };

    render() {
        const {theme, onRetry} = this.props;
        const style = getStyleFromTheme(theme);

        const errorTitle = {
            id: t('mobile.failed_network_action.title'),
            defaultMessage: 'No internet connection',
        };

        const errorDescription = {
            id: t('mobile.failed_network_action.shortDescription'),
            defaultMessage: 'Messages will load when you have an internet connection or {refresh}.',
            values: {
                refresh: (
                    <FormattedText
                        id='mobile.failed_network_action.retry'
                        defaultMessage='try again'
                        style={style.link}
                        onPress={onRetry}
                    />
                ),
            },
        };

        return (
            <View style={style.container}>
                <Cloud
                    color={changeOpacity(theme.centerChannelColor, 0.15)}
                    height={76}
                    width={76}
                />
                <FormattedText
                    id={errorTitle.id}
                    defaultMessage={errorTitle.defaultMessage}
                    style={style.title}
                />
                <FormattedText
                    id={errorDescription.id}
                    defaultMessage={errorDescription.message}
                    style={style.description}
                    values={errorDescription.values}
                />
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
            paddingBottom: 100,
        },
        title: {
            color: changeOpacity(theme.centerChannelColor, 0.8),
            fontSize: 20,
            fontWeight: '600',
            marginBottom: 15,
            marginTop: 10,
        },
        description: {
            color: changeOpacity(theme.centerChannelColor, 0.4),
            fontSize: 17,
            lineHeight: 25,
            textAlign: 'center',
        },
        link: {
            color: theme.linkColor,
        },
    };
});
