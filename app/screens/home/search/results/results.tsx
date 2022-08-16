// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {TabTypes, TabType} from '@utils/search';

import FileResults from './file_results';
import PostResults from './post_results';

import type ChannelModel from '@typings/database/models/servers/channel';
import type PostModel from '@typings/database/models/servers/post';

type Props = {
    canDownloadFiles: boolean;
    currentTimezone: string;
    fileChannels: ChannelModel[];
    fileInfos: FileInfo[];
    isTimezoneEnabled: boolean;
    posts: PostModel[];
    publicLinkEnabled: boolean;
    scrollPaddingTop: number;
    searchValue: string;
    selectedTab: TabType;
}

const Results = ({
    canDownloadFiles,
    currentTimezone,
    fileChannels,
    fileInfos,
    isTimezoneEnabled,
    posts,
    publicLinkEnabled,
    scrollPaddingTop,
    searchValue,
    selectedTab,
}: Props) => {
    return (
        <>
            {(selectedTab === TabTypes.FILES) && (
                <FileResults
                    canDownloadFiles={canDownloadFiles}
                    fileChannels={fileChannels}
                    publicLinkEnabled={publicLinkEnabled}
                    fileInfos={fileInfos}
                    scrollPaddingTop={scrollPaddingTop}
                    searchValue={searchValue}
                />
            )}
            {(selectedTab === TabTypes.MESSAGES) && (
                <PostResults
                    currentTimezone={currentTimezone}
                    isTimezoneEnabled={isTimezoneEnabled}
                    posts={posts}
                    scrollPaddingTop={scrollPaddingTop}
                    searchValue={searchValue}
                />
            )}
        </>
    );
};

export default Results;
