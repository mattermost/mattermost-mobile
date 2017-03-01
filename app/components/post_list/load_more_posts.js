// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent, PropTypes} from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity
} from 'react-native';

import {makeStyleSheetFromTheme} from 'app/utils/theme';

import FormattedText from 'app/components/formatted_text';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return StyleSheet.create({
        container: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            height: 28,
            marginVertical: 10
        },
        text: {
            fontSize: 14,
            fontWeight: '600',
            color: theme.linkColor
        }
    });
});

export default class LoadMorePosts extends PureComponent {
    static propTypes = {
        loading: PropTypes.bool.isRequired,
        loadMore: PropTypes.func,
        theme: PropTypes.object.isRequired,
        style: View.propTypes.style
    };

    loadMore = () => {
        const {loading, loadMore} = this.props;
        if (!loading && typeof loadMore === 'function') {
            loadMore();
        }
    };

    renderText(style) {
        let [id, defaultMessage] = ['posts_view.loadMore', 'Load more messages'];
        if (this.props.loading) {
            [id, defaultMessage] = ['mobile.loading_posts', 'Loading Messages...'];
        }
        return (
            <FormattedText
                id={id}
                defaultMessage={defaultMessage}
                style={style.text}
            />
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
