// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {memo, useState} from 'react';
import FastImage, {FastImageProps} from 'react-native-fast-image';

export const FAST_IMAGE_MAX_RETRIES = 3;

type RetriableFastImageProps = FastImageProps & {
    id: string;
    onError: () => void;
    [x: string]: any;
};

const RetriableFastImage = ({id, onError, ...props}: RetriableFastImageProps) => {
    const [retry, setRetry] = useState<number>(0);

    const onFastImageError = () => {
        const newRetry = retry + 1;
        if (retry > FAST_IMAGE_MAX_RETRIES && onError) {
            onError();
            return;
        }
        setRetry(newRetry);
    };

    return (
        <FastImage
            {...props}
            key={`${id}-${retry}`}
            onError={onFastImageError}
        />
    );
};

export default memo(RetriableFastImage);
