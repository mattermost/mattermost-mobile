// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';

import type {EmojiComponent, EmojiProps} from '@typings/components/emoji';

let emojiComponent: EmojiComponent;

const EmojiWrapper = (props: Omit<EmojiProps, 'customEmojis'>) => {
    const Emoji = useMemo(() => {
        if (!emojiComponent) {
            emojiComponent = require('./emoji').default;
        }
        return emojiComponent;
    }, []);

    return (<Emoji {...props}/>);
};

export default EmojiWrapper;
