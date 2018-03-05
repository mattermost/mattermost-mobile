// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import PropTypes from 'prop-types';
import React from 'react';
import {
    ScrollView,
    Text,
} from 'react-native';

import {makeStyleSheetFromTheme, setNavigatorStyles} from 'app/utils/theme';

export default class TextPreview extends React.PureComponent {
    static propTypes = {
        navigator: PropTypes.object.isRequired,
        theme: PropTypes.object.isRequired,
        content: PropTypes.string.isRequired,
    };

    componentWillReceiveProps(nextProps) {
        if (this.props.theme !== nextProps.theme) {
            setNavigatorStyles(this.props.navigator, nextProps.theme);
        }
    }

    render() {
        const style = getStyleSheet(this.props.theme);

        return (
            <ScrollView
                contentContainerStyle={style.container}
            >
                <Text>
                    {this.props.content}
                </Text>
            </ScrollView>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme(() => {
    return {
        container: {
            minHeight: '100%',
        },
    };
});
