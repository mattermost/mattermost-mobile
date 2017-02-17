// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {
    Component,
    PropTypes
} from 'react';

import {
    View,
    Image,
    StyleSheet
} from 'react-native';

import * as Utils from 'service/utils/file_utils.js';

const styles = StyleSheet.create({
    fileIcon: {
        width: 60,
        height: 60
    },
    fileIconWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 100,
        height: 100,
        backgroundColor: '#fff'
    }
});

export default class FileAttachmentIcon extends Component {
    static propTypes = {
        file: PropTypes.object.isRequired
    };

    render() {
        const {file} = this.props;
        return (
            <View style={styles.fileIconWrapper}>
                <Image
                    style={styles.fileIcon}
                    source={Utils.getFileIconPath(file)}
                />
            </View>
        );
    }
}
