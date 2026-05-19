// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {CompassIconName} from '@components/compass_icon';

type SectionNoticeButtonProps = {
    onClick: () => void;
    text: string;
    loading?: boolean;
    trailingIcon?: CompassIconName;
    leadingIcon?: CompassIconName;
};
