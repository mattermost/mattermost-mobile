// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useManagedConfig} from '@mattermost/react-native-emm';
import React from 'react';
import {StyleSheet, View} from 'react-native';

import InvertedAction from '@screens/gallery/footer/actions/inverted_action';

import Action from './action';

type Props = {
    canDownloadFiles: boolean;
    disabled: boolean;
    enablePublicLinks: boolean;
    fileId: string;
    onCopyPublicLink: () => void;
    onDownload: () => void;
    onShare: () => void;
    hasCaptions: boolean;
    captionEnabled: boolean;
    onCaptionsPress: () => void;
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
});

const Actions = ({
    canDownloadFiles, disabled, enablePublicLinks, fileId, onCopyPublicLink,
    onDownload, onShare, hasCaptions, captionEnabled, onCaptionsPress,
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
            {hasCaptions &&
            <InvertedAction
                activated={captionEnabled}
                iconName='closed-caption-outline'
                onPress={onCaptionsPress}
            />
            }
            {canDownloadFiles &&
            <>
                <Action
                    disabled={disabled}
                    iconName='download-outline'
                    onPress={onDownload}
                />
                <Action
                    disabled={disabled}
                    iconName='export-variant'
                    onPress={onShare}
                />
            </>
            }
        </View>
    );
};

export default Actions;
