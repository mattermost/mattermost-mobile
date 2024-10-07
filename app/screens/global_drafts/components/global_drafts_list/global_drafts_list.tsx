// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {ScrollView, type LayoutChangeEvent} from 'react-native';

import Draft from '@app/components/draft';
import {Screens} from '@app/constants';

import type DraftModel from '@typings/database/models/servers/draft';

type Props = {
    allDrafts: DraftModel[];
    location: string;
}

const GlobalDraftsList: React.FC<Props> = ({
    allDrafts,
    location,
}) => {
    const [layoutWidth, setLayoutWidth] = useState(0);
    const onLayout = useCallback((e: LayoutChangeEvent) => {
        if (location === Screens.GLOBAL_DRAFTS) {
            setLayoutWidth(e.nativeEvent.layout.width - 40); // 40 is the padding of the container
        }
    }, [location]);
    return (
        <ScrollView
            scrollEnabled={true}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            onLayout={onLayout}
        >
            {allDrafts.map((draft) => {
                return (
                    <Draft
                        key={draft.id}
                        channelId={draft.channelId}
                        draft={draft}
                        location={Screens.GLOBAL_DRAFTS}
                        layoutWidth={layoutWidth}
                    />
                );
            })}
        </ScrollView>);
};

export default GlobalDraftsList;
