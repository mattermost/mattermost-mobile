// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type ButtonSize = 'xs' | 's' | 'm' | 'lg'
type ButtonEmphasis = 'primary' | 'secondary' | 'tertiary' | 'link'
type ButtonType = 'default' | 'destructive' | 'inverted' | 'disabled'
type ButtonState = 'default' | 'hover' | 'active' | 'focus'

type BackgroundColorObject = {
    [key in ButtonEmphasis]: {
        [ke in ButtonType]: {
            [k in ButtonState]: ViewStyle | string[]
        }
    }
}

type BackgroundStyle = (theme: Theme) => BackgroundColorObject
