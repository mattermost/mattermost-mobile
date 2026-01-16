// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {usePropsFromParams} from '@hooks/props_from_params';
import EmojiPickereScreen, {type EmojiPickerProps} from '@screens/emoji_picker';

export default function EmojiPickereRoute() {
    const props = usePropsFromParams<EmojiPickerProps>();

    return <EmojiPickereScreen {...props}/>;
}
