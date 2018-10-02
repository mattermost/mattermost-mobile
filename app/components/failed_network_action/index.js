// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {TouchableOpacity, View} from 'react-native';

import FormattedText from 'app/components/formatted_text';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';
import {t} from 'app/utils/i18n';

import Cloud from './cloud';

export default class FailedNetworkAction extends PureComponent {
    static propTypes = {
        onRetry: PropTypes.func,
        theme: PropTypes.object.isRequired,
        errorTitle: PropTypes.object,
        errorDescription: PropTypes.object,
    };

    static defaultProps = {
        errorTitle: {
            id: t('mobile.failed_network_action.title'),
            defaultMessage: 'No internet connection',
        },
        errorDescription: {
            id: t('mobile.failed_network_action.description'),
            defaultMessage: 'There seems to be a problem with your internet connection. Make sure you have an active connection and try again.',
        },
    };

    render() {
        const {theme, onRetry} = this.props;
        const style = getStyleFromTheme(theme);

        return (
            <View style={style.container}>
                <Cloud
                    color={changeOpacity(theme.centerChannelColor, 0.15)}
                    height={76}
                    width={76}
                />
                <FormattedText
                    id={this.props.errorTitle.id}
                    defaultMessage={this.props.errorTitle.defaultMessage}
                    style={style.title}
                />
                <FormattedText
                    id={this.props.errorDescription.id}
                    defaultMessage={this.props.errorDescription.message}
                    style={style.description}
                />
                {onRetry &&
                <TouchableOpacity
                    onPress={onRetry}
                    style={style.retryContainer}
                >
                    <FormattedText
                        id='mobile.failed_network_action.retry'
                        defaultMessage='Try Again'
                        style={style.retry}
                    />
                </TouchableOpacity>
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
            fontWeight: '600',
            marginBottom: 15,
        },
        description: {
            color: changeOpacity(theme.centerChannelColor, 0.4),
            fontSize: 17,
            textAlign: 'center',
        },
        retryContainer: {
            marginTop: 30,
        },
        retry: {
            color: changeOpacity(theme.centerChannelColor, 0.7),
            fontSize: 16,
            fontWeight: '600',
        },
    };
});
