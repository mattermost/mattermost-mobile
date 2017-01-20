// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes} from 'react';
import {
    StyleSheet,
    Text,
    View
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

import FormattedDate from 'app/components/formatted_date';
import FormattedText from 'app/components/formatted_text';

const style = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        marginBottom: 40,
        padding: 15
    },
    channelName: {
        marginLeft: 5,
        fontSize: 15,
        fontWeight: '600'
    },
    channelNameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: 10
    },
    createdBy: {
        flexDirection: 'row',
        fontSize: 11,
        opacity: 0.5,
        marginTop: 5
    },
    detail: {
        fontSize: 13
    },
    header: {
        fontSize: 12,
        opacity: 0.5,
        marginBottom: 10
    },
    section: {
        marginTop: 15
    },
    url: {
        fontSize: 11,
        opacity: 0.5,
        marginBottom: 10
    }
});

function channelInfoHeader(props) {
    const {createAt, creator, displayName, header, purpose} = props;
    return (
        <View style={style.container}>
            <View style={style.channelNameContainer}>
                <Icon
                    name='globe'
                    size={15}
                    color='rgba(0, 0, 0, 0.7)'
                />
                <Text style={style.channelName}>{displayName}</Text>
            </View>
            {purpose.length > 0 &&
                <View style={style.section}>
                    <FormattedText
                        style={style.header}
                        id='channel_info.purpose'
                        defaultMessage='Purpose'
                    />
                    <Text style={style.detail}>{purpose}</Text>
                </View>
            }
            {header.length > 0 &&
                <View style={style.section}>
                    <FormattedText
                        style={style.header}
                        id='channel_info.header'
                        defaultMessage='Header'
                    />
                    <Text style={style.detail}>{header}</Text>
                </View>
            }
            {creator &&
                <Text style={style.createdBy}>
                    <FormattedText
                        id='mobile.routes.channelInfo.createdBy'
                        defaultMessage='Created by {creator} on '
                        values={{
                            creator
                        }}
                    />
                    <FormattedDate
                        value={new Date(createAt)}
                        year='numeric'
                        month='long'
                        day='2-digit'
                    />
                </Text>
            }
        </View>
    );
}

channelInfoHeader.propTypes = {
    createAt: PropTypes.number.isRequired,
    creator: PropTypes.string,
    displayName: PropTypes.string.isRequired,
    header: PropTypes.string,
    purpose: PropTypes.string
};

export default channelInfoHeader;
