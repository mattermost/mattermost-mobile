// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useManagedConfig} from '@mattermost/react-native-emm';
import React from 'react';
import {StyleSheet, View} from 'react-native';

import Action from './action';

type Props = {
    canDownloadFiles: boolean;
    disabled: boolean;
    enablePublicLinks: boolean;
    fileId: string;
    onCopyPublicLink: () => void;
    onDownload: () => void;
    onShare: () => void;
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
    },
    action: {
        marginLeft: 24,
    },
});

const Actions = ({
    canDownloadFiles, disabled, enablePublicLinks, fileId,
    onCopyPublicLink, onDownload, onShare,
}: Props) => {
    const managedConfig = useManagedConfig<ManagedConfig>();
    const canCopyPublicLink = !fileId.startsWith('uid') && enablePublicLinks && managedConfig.copyAndPasteProtection !== 'true';

    return (
        <View style={styles.container}>
            {canCopyPublicLink &&
            <Action
                disabled={disabled}
                iconName='link-variant'
                onPress={onCopyPublicLink}
            />}
            {canDownloadFiles &&
            <>
                <Action
                    disabled={disabled}
                    iconName='download-outline'
                    onPress={onDownload}
                    style={styles.action}
                />
                <Action
                    disabled={disabled}
                    iconName='export-variant'
                    onPress={onShare}
                    style={styles.action}
                />
            </>
            }
        </View>
    );
};

export default Actions;
