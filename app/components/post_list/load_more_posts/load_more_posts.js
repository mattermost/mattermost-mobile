// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    ActivityIndicator,
    TouchableOpacity,
    View,
    ViewPropTypes,
} from 'react-native';

import {makeStyleSheetFromTheme} from 'app/utils/theme';

import FormattedText from 'app/components/formatted_text';

export default class LoadMorePosts extends PureComponent {
    static propTypes = {
        channelId: PropTypes.string.isRequired, // eslint-disable-line react/no-unused-prop-types
        loading: PropTypes.bool.isRequired,
        loadMore: PropTypes.func,
        theme: PropTypes.object.isRequired,
        style: ViewPropTypes.style,
    };

    loadMore = () => {
        const {loading, loadMore} = this.props;
        if (!loading && typeof loadMore === 'function') {
            loadMore();
        }
    };

    renderText(style) {
        if (this.props.loading) {
            const i18nId = 'mobile.loading_posts';
            const defaultMessage = 'Loading messages...';

            return (
                <FormattedText
                    id={i18nId}
                    defaultMessage={defaultMessage}
                    style={style.text}
                />
            );
        }

        return (
            <View style={{flex: 1, alignItems: 'center'}}>
                <ActivityIndicator/>
            </View>
        );
    }

    render() {
        const style = getStyleSheet(this.props.theme);
        return (
            <View style={[style.container, this.props.style]}>
                <TouchableOpacity onPress={this.loadMore}>
                    {this.renderText(style)}
                </TouchableOpacity>
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            height: 28,
            marginVertical: 10,
        },
        text: {
            fontSize: 14,
            fontWeight: '600',
            color: theme.linkColor,
        },
    };
});
