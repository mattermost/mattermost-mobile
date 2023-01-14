// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {StyleSheet, View} from 'react-native';

import {MAX_RESOLUTION} from '@constants/image';
import ErrorLabel from '@share/components/error/label';
import {setShareExtensionGlobalError, useShareExtensionFiles} from '@share/state';
import {getFormattedFileSize} from '@utils/file';

import Multiple from './multiple';
import Single from './single';

type Props = {
    canUploadFiles: boolean;
    maxFileCount: number;
    maxFileSize: number;
    theme: Theme;
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
    },
    margin: {
        marginHorizontal: 20,
    },
});

const Attachments = ({canUploadFiles, maxFileCount, maxFileSize, theme}: Props) => {
    const intl = useIntl();
    const files = useShareExtensionFiles();

    const error = useMemo(() => {
        if (!canUploadFiles) {
            return intl.formatMessage({
                id: 'share_extension.upload_disabled',
                defaultMessage: 'File uploads are disabled for the selected server',
            });
        }

        if (files.length > maxFileCount) {
            return intl.formatMessage({
                id: 'share_extension.count_limit',
                defaultMessage: 'You can only share {count, number} {count, plural, one {file} other {files}} on this server',
            }, {count: maxFileCount});
        }

        let maxResolutionError = false;
        const totalSize = files.reduce((total, file) => {
            if (file.width && file.height && !maxResolutionError) {
                maxResolutionError = (file.width * file.height) > MAX_RESOLUTION;
            }
            return total + (file.size || 0);
        }, 0);

        if (totalSize > maxFileSize) {
            if (files.length > 1) {
                return intl.formatMessage({
                    id: 'share_extension.file_limit.multiple',
                    defaultMessage: 'Each file must be less than {size}',
                }, {size: getFormattedFileSize(maxFileSize)});
            }

            return intl.formatMessage({
                id: 'share_extension.file_limit.single',
                defaultMessage: 'File must be less than {size}',
            }, {size: getFormattedFileSize(maxFileSize)});
        }

        if (maxResolutionError) {
            return intl.formatMessage({
                id: 'share_extension.max_resolution',
                defaultMessage: 'Image exceeds maximum dimensions of 7680 x 4320 px',
            });
        }

        return undefined;
    }, [canUploadFiles, maxFileCount, maxFileSize, files, intl.locale]);

    const attachmentsContainerStyle = useMemo(() => [
        styles.container,
        files.length === 1 && styles.margin,
    ], [files]);

    useEffect(() => {
        setShareExtensionGlobalError(Boolean(error));
    }, [error]);

    let attachments;
    if (files.length === 1) {
        attachments = (
            <Single
                file={files[0]}
                maxFileSize={maxFileSize}
                theme={theme}
            />
        );
    } else {
        attachments = (
            <Multiple
                files={files}
                maxFileSize={maxFileSize}
                theme={theme}
            />
        );
    }

    return (
        <>
            <View style={attachmentsContainerStyle}>
                {attachments}
            </View>
            {Boolean(error) &&
                <ErrorLabel
                    text={error!}
                    theme={theme}
                />
            }
        </>
    );
};

export default Attachments;
