// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Platform,
    TouchableOpacity,
    View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import FormattedText from 'app/components/formatted_text';
import {makeStyleSheetFromTheme} from 'app/utils/theme';

export default class PostListRetry extends PureComponent {
    static propTypes = {
        retry: PropTypes.func.isRequired,
        theme: PropTypes.object.isRequired,
    };

    render() {
        const {retry, theme} = this.props;
        const style = getStyleSheet(theme);

        return (
            <View style={style.container}>
                <TouchableOpacity
                    onPress={retry}
                    style={style.buttonContainer}
                >
                    <View style={style.buttonWrapper}>
                        <Icon
                            name='md-refresh'
                            size={50}
                            style={style.icon}
                        />
                    </View>
                    <FormattedText
                        id='mobile.post.retry'
                        defaultMessage='Refresh'
                        style={style.text}
                    />
                </TouchableOpacity>
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        buttonContainer: {
            alignItems: 'center',
            justifyContent: 'center',
        },
        buttonWrapper: {
            height: 60,
            width: 60,
            borderRadius: 30,
            backgroundColor: '#ddd',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
        },
        container: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
        },
        icon: {
            color: theme.linkColor,
            ...Platform.select({
                ios: {
                    marginTop: 5,
                },
            }),
        },
        text: {
            marginTop: 15,
            color: theme.linkColor,
        },
    };
});
