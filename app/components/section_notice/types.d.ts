// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type SectionNoticeButtonProps = {
    onClick: () => void;
    text: string;
    loading?: boolean;
    trailingIcon?: string;
    leadingIcon?: string;
};
