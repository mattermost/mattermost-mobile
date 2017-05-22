// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import {
    StyleSheet,
    View,
    ViewPropTypes
} from 'react-native';

import FormattedText from 'app/components/formatted_text';

function NewMessagesDivider(props) {
    return (
        <View style={[style.container, props.style]}>
            <View style={style.line}/>
            <View style={style.textContainer}>
                <FormattedText
                    id='post_list.newMsg'
                    defaultMessage='New Messages'
                    style={style.text}
                />
            </View>
            <View style={style.line}/>
        </View>
    );
}

NewMessagesDivider.propTypes = {
    style: ViewPropTypes.style
};

const style = StyleSheet.create({
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
        height: StyleSheet.hairlineWidth,
        backgroundColor: '#f80'
    },
    text: {
        fontSize: 14,
        fontWeight: '600',
        color: '#ffaf53'
    }
});

export default NewMessagesDivider;
