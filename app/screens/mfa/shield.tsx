// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import * as React from 'react';
import Svg, {
    Path,
    G,
    Ellipse,
    Defs,
    ClipPath,
    Rect,
} from 'react-native-svg';

type Props = {
    theme: Theme;
};

const Shield = ({theme}: Props) => {
    return (
        <Svg
            width={204}
            height={178}
            viewBox='0 0 204 178'
            fill='none'
        >
            <G clipPath='url(#clip0_4400_147508)'>
                <Ellipse
                    cx={101.254}
                    cy={88.2521}
                    rx={89}
                    ry={89}
                    fill={theme.centerChannelColor}
                    fillOpacity={0.08}
                />
                <Path
                    d='M7.48047 74.7899L7.48047 87.8179L167.791 87.8179L167.791 101.714L191.464 101.714'
                    stroke={theme.centerChannelColor}
                    strokeOpacity={0.24}
                    strokeWidth={1.4958}
                    strokeLinecap='round'
                />
                <Path
                    d='M151.074 140.605L151.074 118.168L128.637 118.168'
                    stroke={theme.centerChannelColor}
                    strokeOpacity={0.24}
                    strokeWidth={1.4958}
                    strokeLinecap='round'
                />
                <Ellipse
                    cx={2.2437}
                    cy={2.2437}
                    rx={2.2437}
                    ry={2.2437}
                    transform='matrix(1 8.74228e-08 8.74228e-08 -1 4.48828 76.2857)'
                    fill={theme.centerChannelColor}
                    fillOpacity={0.48}
                />
                <Ellipse
                    cx={150.327}
                    cy={142.849}
                    rx={2.2437}
                    ry={2.2437}
                    transform='rotate(180 150.327 142.849)'
                    fill={theme.centerChannelColor}
                    fillOpacity={0.48}
                />
                <Ellipse
                    cx={2.2437}
                    cy={2.2437}
                    rx={2.2437}
                    ry={2.2437}
                    transform='matrix(1 8.74228e-08 8.74228e-08 -1 189.965 103.21)'
                    fill={theme.centerChannelColor}
                    fillOpacity={0.48}
                />
                <Path
                    d='M101.448 20.3923C121.706 39.1274 140.991 45.9177 159.863 45.9177H159.941L160.017 45.9343L160.204 45.9734L160.848 46.1082L160.797 46.7634C157.271 92.1489 148.396 133.029 108.802 155.042H108.801L101.304 159.209L100.939 159.411L100.575 159.208L92.833 154.879V154.88C53.5766 132.94 44.8557 92.4334 41.1377 47.4089L41.0801 46.7175L41.7656 46.6082L44.6426 46.1531L44.6748 46.1472L44.707 46.1453C57.8103 45.2131 67.4819 43.6304 75.9902 39.8787C84.4857 36.1326 91.8834 30.1961 100.377 20.45L100.883 19.8689L101.448 20.3923Z'
                    fill={theme.centerChannelBg}
                    stroke={theme.centerChannelColor}
                    strokeWidth={1.4958}
                />
                <Path
                    d='M43.3782 97.2269C45.3597 103.894 47.7358 110.297 50.6059 116.385M52.7223 120.642C57.6541 130.057 63.8878 138.643 71.8196 146.185M74.1347 148.314C75.779 149.776 77.4922 151.196 79.2773 152.571'
                    stroke={theme.centerChannelColor}
                    strokeWidth={1.4958}
                    strokeLinecap='round'
                    strokeLinejoin='round'
                />
                <Path
                    d='M100.942 146.588L94.3759 143.013C61.3934 125.058 54.0083 91.9102 50.8555 54.7213L53.2955 54.3447C75.5608 52.8019 86.4613 49.0927 100.942 32.9076C118.226 48.4772 134.731 54.1584 150.915 54.1584L151.074 54.1908C148.084 91.6754 140.569 125.131 107.301 143.146L100.942 146.588Z'
                    fill={theme.centerChannelColor}
                    fillOpacity={0.12}
                />
                <Path
                    d='M63.6641 75.7059H129.662'
                    stroke={theme.centerChannelColor}
                    strokeOpacity={0.12}
                    strokeWidth={1.4958}
                    strokeLinecap='round'
                />
                <Path
                    d='M73.5 84.1313H139.498'
                    stroke={theme.centerChannelColor}
                    strokeOpacity={0.12}
                    strokeWidth={1.4958}
                    strokeLinecap='round'
                />
                <Path
                    d='M66.4766 93.9608H132.475'
                    stroke={theme.centerChannelColor}
                    strokeOpacity={0.12}
                    strokeWidth={1.4958}
                    strokeLinecap='round'
                />
                <Path
                    d='M79.1133 110.811H110.006'
                    stroke={theme.centerChannelColor}
                    strokeOpacity={0.12}
                    strokeWidth={1.4958}
                    strokeLinecap='round'
                />
                <Path
                    d='M58.0508 67.4668H79.1141'
                    stroke={theme.centerChannelColor}
                    strokeOpacity={0.12}
                    strokeWidth={1.4958}
                    strokeLinecap='round'
                />
                <Path
                    d='M83.3281 67.4668H114.221'
                    stroke={theme.centerChannelColor}
                    strokeOpacity={0.12}
                    strokeWidth={1.4958}
                    strokeLinecap='round'
                />
                <Path
                    d='M118.43 67.4668H145.11'
                    stroke={theme.centerChannelColor}
                    strokeOpacity={0.12}
                    strokeWidth={1.4958}
                    strokeLinecap='round'
                />
                <Path
                    d='M98.7734 119.237H125.454'
                    stroke={theme.centerChannelColor}
                    strokeOpacity={0.12}
                    strokeWidth={1.4958}
                    strokeLinecap='round'
                />
                <Path
                    d='M79.1133 119.237H94.5597'
                    stroke={theme.centerChannelColor}
                    strokeOpacity={0.12}
                    strokeWidth={1.4958}
                    strokeLinecap='round'
                />
                <Path
                    d='M69.2852 101.98H100.178'
                    stroke={theme.centerChannelColor}
                    strokeOpacity={0.12}
                    strokeWidth={1.4958}
                    strokeLinecap='round'
                />
                <Path
                    d='M104.391 101.98H131.071'
                    stroke={theme.centerChannelColor}
                    strokeOpacity={0.12}
                    strokeWidth={1.4958}
                    strokeLinecap='round'
                />
                <Path
                    d='M63.6641 59.5573H98.7695'
                    stroke={theme.centerChannelColor}
                    strokeOpacity={0.12}
                    strokeWidth={1.4958}
                    strokeLinecap='round'
                />
                <Path
                    d='M104.383 59.5573H139.488'
                    stroke={theme.centerChannelColor}
                    strokeOpacity={0.12}
                    strokeWidth={1.4958}
                    strokeLinecap='round'
                />
                <Path
                    fillRule='evenodd'
                    clipRule='evenodd'
                    d='M85.2594 84.3456H116.846C118.308 84.3456 119.488 85.5212 119.488 86.9784V98.601C119.488 108.524 115.037 116.571 105.09 116.571H97.0153C87.0687 116.571 82.6172 108.524 82.6172 98.601V86.9784C82.6172 85.5262 83.8025 84.3456 85.2594 84.3456ZM100.472 91.1313H99.07V94.4254V100.223L100.928 102.081L99.07 103.939V106.396H104.158V96.2787L102.734 94.854L104.158 93.4293V91.1313H100.472Z'
                    fill='#1C58D9'
                />
                <Path
                    fillRule='evenodd'
                    clipRule='evenodd'
                    d='M109.755 79.4381V84.4039C109.755 84.4343 109.756 84.4641 109.758 84.4934H114.206C114.208 84.4641 114.21 84.4343 114.21 84.4039V79.4381C114.21 72.0005 109.339 65.9471 102.176 65.9471H99.1429C91.9798 65.9471 87.1094 72.0005 87.1094 79.4381V84.4039C87.1094 84.4343 87.1105 84.4641 87.1128 84.4934H91.5522C91.5544 84.4641 91.5556 84.4343 91.5556 84.4039V79.4381C91.5556 74.3775 94.7223 70.5235 98.4782 70.5235H102.832C106.838 70.5235 109.755 74.3775 109.755 79.4381Z'
                    fill='#1C58D9'
                />
                <Path
                    d='M110.688 22.437C110.688 22.437 124.408 36.841 152.57 41.8824'
                    stroke={theme.centerChannelColor}
                    strokeWidth={1.4958}
                    strokeLinecap='round'
                    strokeLinejoin='round'
                />
            </G>
            <Defs>
                <ClipPath id='clip0_4400_147508'>
                    <Rect
                        width={203.429}
                        height={178}
                        fill={theme.centerChannelBg}
                    />
                </ClipPath>
            </Defs>
        </Svg>
    );
};

export default Shield;
