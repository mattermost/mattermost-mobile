// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import {
    View,
    ViewPropTypes,
} from 'react-native';

import FormattedText from 'app/components/formatted_text';
import {makeStyleSheetFromTheme} from 'app/utils/theme';

function NewMessagesDivider(props) {
    const style = getStyleFromTheme(props.theme);

    let text = (
        <FormattedText
            id='posts_view.newMsg'
            defaultMessage='New Messages'
            style={style.text}
        />
    );

    if (props.moreMessages) {
        text = (
            <FormattedText
                id='mobile.posts_view.moreMsg'
                defaultMessage='More New Messages Above'
                style={style.text}
            />
        );
    }

    return (
        <View style={[style.container, props.style]}>
            <View style={style.line}/>
            <View style={style.textContainer}>
                {text}
            </View>
            <View style={style.line}/>
        </View>
    );
}

NewMessagesDivider.propTypes = {
    moreMessages: PropTypes.bool,
    style: ViewPropTypes.style,
    theme: PropTypes.object,
};

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            alignItems: 'center',
            flexDirection: 'row',
            height: 28,
        },
        textContainer: {
            marginHorizontal: 15,
        },
        line: {
            flex: 1,
            height: 1,
            backgroundColor: theme.newMessageSeparator,
        },
        text: {
            fontSize: 14,
            color: theme.newMessageSeparator,
        },
    };
});

export default NewMessagesDivider;
