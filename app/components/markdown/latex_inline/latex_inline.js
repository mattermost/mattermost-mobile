// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import PropTypes from 'prop-types';
import React, {PureComponent} from 'react';
import {Text} from 'react-native';
import MathView from 'react-native-math-view';

import {makeStyleSheetFromTheme} from '@utils/theme';

export default class LatexInline extends PureComponent {
    static propTypes = {
        content: PropTypes.string.isRequired,
        theme: PropTypes.object.isRequired,
    };

    render() {
        const style = getStyleSheet(this.props.theme);

        return (
            <MathView
                style={style.mathStyle}
                math={this.props.content}
                onError={(errorMsg) => {
                    return <Text style={style.errorText}>{'Latex error: ' + errorMsg.message}</Text>;
                }}
                renderError={(errorMsg) => {
                    return <Text style={style.errorText}>{'Latex render error: ' + errorMsg.error.message}</Text>;
                }}
                resizeMode={'cover'}
            />
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme(() => {
    return {
        block: {
            alignItems: 'flex-start',
            flexDirection: 'row',
            flexWrap: 'wrap',
        },
        jumboEmoji: {
            fontSize: 40,
            lineHeight: 50,
        },
        mathStyle: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
        },
        errorText: {
            color: 'rgb(255, 0, 0)',
        },
    };
});
