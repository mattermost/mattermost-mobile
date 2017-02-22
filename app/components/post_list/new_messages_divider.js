// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import {StyleSheet, View} from 'react-native';

import FormattedText from 'app/components/formatted_text';

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
    style: View.propTypes.style
};

export default NewMessagesDivider;
