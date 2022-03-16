// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect, useState} from 'react';
import {Navigation} from 'react-native-navigation';

const useToastToggler = (componentId: string, isDismissible: boolean) => {
    const [showToast, setShowToast] = useState<boolean|undefined>(true);
    useEffect(() => {
        if (showToast && isDismissible) {
            const t = setTimeout(() => {
                setShowToast(false);
                Navigation.dismissOverlay(componentId);
                clearTimeout(t);
            }, 3000);
        }
    }, [showToast]);

    return showToast;
};

export default useToastToggler;
