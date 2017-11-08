// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import {
    View,
    ViewPropTypes
} from 'react-native';

import FormattedText from 'app/components/formatted_text';
import {makeStyleSheetFromTheme} from 'app/utils/theme';

function NewMessagesDivider(props) {
    const style = getStyleFromTheme(props.theme);

    return (
        <View style={[style.container, props.style]}>
            <View style={style.line}/>
            <View style={style.textContainer}>
                <FormattedText
                    id='posts_view.newMsg'
                    defaultMessage='New Messages'
                    style={style.text}
                />
            </View>
            <View style={style.line}/>
        </View>
    );
}

NewMessagesDivider.propTypes = {
    style: ViewPropTypes.style,
    theme: PropTypes.object
};

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            alignItems: 'center',
            flexDirection: 'row',
            height: 28
        },
        textContainer: {
            marginHorizontal: 15
        },
        line: {
            flex: 1,
            height: 1,
            backgroundColor: theme.newMessageSeparator
        },
        text: {
            fontSize: 14,
            color: theme.newMessageSeparator
        }
    };
});

export default NewMessagesDivider;
