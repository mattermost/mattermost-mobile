// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type EmojiAlias = {
    aliases: string [];
    name: string;
    short_name: string;
    category?: string;
}

type EmojiSection = {
    data: EmojiAlias[][];
    defaultMessage?: string;
    icon: string;
    id: string;
    key: string;
}

type CategoryTranslation = {
    id: string;
    defaultMessage: string;
    icon: string;
}
