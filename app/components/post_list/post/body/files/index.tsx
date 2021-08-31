// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {DeviceEventEmitter, StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {Device} from '@constants';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {useServerUrl} from '@context/server_url';
import {useSplitView} from '@hooks/device';
import NetworkManager from '@init/network_manager';
import {isGif, isImage} from '@utils/file';
import {openGalleryAtIndex} from '@utils/gallery';
import {getViewPortWidth} from '@utils/images';
import {preventDoubleTap} from '@utils/tap';

import File from './file';

import type {Client} from '@client/rest';
import type {WithDatabaseArgs} from '@typings/database/database';
import type FileModel from '@typings/database/models/servers/file';
import type PostModel from '@typings/database/models/servers/post';
import type SystemModel from '@typings/database/models/servers/system';

type FilesProps = {
    authorId: string;
    canDownloadFiles: boolean;
    failed?: boolean;
    files: FileModel[];
    isReplyPost: boolean;
    postId: string;
    theme: Theme;
}

const MAX_VISIBLE_ROW_IMAGES = 4;
const styles = StyleSheet.create({
    row: {
        flex: 1,
        flexDirection: 'row',
        marginTop: 5,
    },
    container: {
        flex: 1,
    },
    gutter: {
        marginLeft: 8,
    },
    failed: {
        opacity: 0.5,
    },
});

const Files = ({authorId, canDownloadFiles, failed, files, isReplyPost, postId, theme}: FilesProps) => {
    const [inViewPort, setInViewPort] = useState(false);
    const serverUrl = useServerUrl();
    const isSplitView = useSplitView();
    const imageAttachments = useRef<FileInfo[]>([]).current;
    const nonImageAttachments = useRef<FileInfo[]>([]).current;
    const filesInfo: FileInfo[] = useMemo(() => files.map((f) => ({
        id: f.id,
        user_id: authorId,
        post_id: postId,
        create_at: 0,
        delete_at: 0,
        update_at: 0,
        name: f.name,
        extension: f.extension,
        mini_preview: f.imageThumbnail,
        size: f.size,
        mime_type: f.mimeType,
        height: f.height,
        has_preview_image: Boolean(f.imageThumbnail),
        localPath: f.localPath,
        width: f.width,
    })), [files]);
    let client: Client | undefined;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch {
        // do nothing
    }

    if (!imageAttachments.length && !nonImageAttachments.length) {
        filesInfo.reduce((info, file) => {
            if (isImage(file)) {
                let uri;
                if (file.localPath) {
                    uri = file.localPath;
                } else {
                    uri = isGif(file) ? client?.getFileUrl(file.id!, 0) : client?.getFilePreviewUrl(file.id!, 0);
                }
                info.imageAttachments.push({...file, uri});
            } else {
                info.nonImageAttachments.push(file);
            }
            return info;
        }, {imageAttachments, nonImageAttachments});
    }

    const filesForGallery = useRef<FileInfo[]>(imageAttachments.concat(nonImageAttachments)).current;
    const attachmentIndex = (fileId: string) => {
        return filesForGallery.findIndex((file) => file.id === fileId) || 0;
    };

    const handlePreviewPress = preventDoubleTap((idx: number) => {
        openGalleryAtIndex(idx, filesForGallery);
    });

    const isSingleImage = () => (files.length === 1 && isImage(files[0]));

    const renderItems = (items: FileInfo[], moreImagesCount = 0, includeGutter = false) => {
        const singleImage = isSingleImage();
        let nonVisibleImagesCount: number;
        let container: StyleProp<ViewStyle> = styles.container;
        const containerWithGutter = [container, styles.gutter];

        return items.map((file, idx) => {
            if (moreImagesCount && idx === MAX_VISIBLE_ROW_IMAGES - 1) {
                nonVisibleImagesCount = moreImagesCount;
            }

            if (idx !== 0 && includeGutter) {
                container = containerWithGutter;
            }

            return (
                <View
                    style={container}
                    key={file.id}
                >
                    <File
                        key={file.id}
                        canDownloadFiles={canDownloadFiles}
                        file={file}
                        index={attachmentIndex(file.id!)}
                        onPress={handlePreviewPress}
                        theme={theme}
                        isSingleImage={singleImage}
                        nonVisibleImagesCount={nonVisibleImagesCount}
                        wrapperWidth={getViewPortWidth(isReplyPost, (!isSplitView && Device.IS_TABLET))}
                        inViewPort={inViewPort}
                    />
                </View>
            );
        });
    };

    const renderImageRow = () => {
        if (imageAttachments.length === 0) {
            return null;
        }

        const visibleImages = imageAttachments.slice(0, MAX_VISIBLE_ROW_IMAGES);
        const tabletOffset = !isSplitView && Device.IS_TABLET;
        const portraitPostWidth = getViewPortWidth(isReplyPost, tabletOffset);

        let nonVisibleImagesCount;
        if (imageAttachments.length > MAX_VISIBLE_ROW_IMAGES) {
            nonVisibleImagesCount = imageAttachments.length - MAX_VISIBLE_ROW_IMAGES;
        }

        return (
            <View style={[styles.row, {width: portraitPostWidth}]}>
                { renderItems(visibleImages, nonVisibleImagesCount, true) }
            </View>
        );
    };

    useEffect(() => {
        const onScrollEnd = DeviceEventEmitter.addListener('scrolled', (viewableItems) => {
            if (postId in viewableItems) {
                setInViewPort(true);
            }
        });

        return () => onScrollEnd.remove();
    }, []);

    return (
        <View style={[failed && styles.failed]}>
            {renderImageRow()}
            {renderItems(nonImageAttachments)}
        </View>
    );
};

const withConfigAndLicense = withObservables([], ({database}: WithDatabaseArgs) => ({
    enableMobileFileDownload: database.get(MM_TABLES.SERVER.SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CONFIG).pipe(
        switchMap((cfg: SystemModel) => of$(cfg.value.EnableMobileFileDownload !== 'false')),
    ),
    complianceDisabled: database.get(MM_TABLES.SERVER.SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.LICENSE).pipe(
        switchMap((lc: SystemModel) => of$(lc.value.IsLicensed === 'false' || lc.value.Compliance === 'false')),
    ),
}));

const withCanDownload = withObservables(
    ['enableMobileFileDownload', 'complianceDisabled', 'post'],
    ({enableMobileFileDownload, complianceDisabled, post}: {enableMobileFileDownload: boolean; complianceDisabled: boolean; post: PostModel}) => {
        return {
            authorId: of$(post.userId),
            canDownloadFiles: of$(complianceDisabled || enableMobileFileDownload),
            postId: of$(post.id),
        };
    });

export default withDatabase(withConfigAndLicense(withCanDownload(React.memo(Files))));
