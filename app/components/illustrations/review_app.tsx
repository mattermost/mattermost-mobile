// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import * as React from 'react';
import Svg, {
    Path,
    G,
    Rect,
    Circle,
} from 'react-native-svg';

type Props = {
    theme: Theme;
}

function ReviewAppIllustration({theme}: Props) {
    return (
        <Svg
            width={135}
            height={150}
            viewBox='0 0 114 127'
            fill='none'
        >
            <Path
                d='M3 93.1839C3 90.8732 4.87318 89 7.18386 89H36.2094C38.5201 89 40.3932 90.8732 40.3932 93.1839V122.209C40.3932 124.52 38.5201 126.393 36.2094 126.393H7.18386C4.87318 126.393 3 124.52 3 122.209V93.1839Z'
                fill='#1C58D9'
                fillOpacity='0.16'
            />
            <Path
                opacity='0.5'
                fillRule='evenodd'
                clipRule='evenodd'
                d='M16.6069 116.08V116.607H12.2969V104.754H16.6069V105.195C16.6445 103.938 17.4073 103.278 18.3655 102.448C19.387 101.563 20.6305 100.486 21.4543 98.2893C23.0705 93.9793 24.6868 97.7506 24.6868 99.3669C24.6868 100.983 23.0705 104.754 23.0705 104.754C23.0705 104.754 28.4581 104.754 30.0744 105.293C31.6906 105.832 31.1519 108.526 30.0744 108.526C31.1519 109.603 30.6131 111.758 29.5356 111.758C30.6131 112.836 29.5356 114.991 28.4581 114.991C29.5356 116.607 26.8418 117.146 22.5318 117.146C16.9764 117.146 16.6287 116.199 16.6069 116.08Z'
                fill={theme.centerChannelBg}
            />
            <Path
                d='M23.0705 104.754C23.0705 104.754 28.4581 104.754 30.0744 105.293C31.6906 105.832 31.1519 108.526 30.0744 108.526C31.1519 109.603 30.6131 111.758 29.5356 111.758C30.6131 112.836 29.5356 114.991 28.4581 114.991C29.5356 116.607 26.8418 117.146 22.5318 117.146C16.6055 117.146 16.6055 116.068 16.6055 116.068V105.293C16.6055 102.599 19.838 102.599 21.4543 98.2893C23.0705 93.9793 24.6868 97.7506 24.6868 99.3669C24.6868 100.983 23.0705 104.754 23.0705 104.754ZM23.0705 104.754H21.4543'
                stroke={theme.centerChannelColor}
                strokeLinecap='round'
            />
            <Path
                d='M12.2969 104.754H16.6069V116.607H12.2969V104.754Z'
                stroke={theme.centerChannelColor}
            />
            <Path
                d='M75 93.6571C75 92.1896 76.1896 91 77.6571 91H96.0903C97.5578 91 98.7474 92.1896 98.7474 93.6571V112.09C98.7474 113.558 97.5578 114.747 96.0903 114.747H77.6571C76.1896 114.747 75 113.558 75 112.09V93.6571Z'
                fill={theme.centerChannelColor}
                fillOpacity='0.08'
            />
            <G>
                <Circle
                    opacity='0.5'
                    cx='86.5'
                    cy='102.5'
                    r='6.5'
                    fill={theme.centerChannelBg}
                />
                <Circle
                    cx='86.5'
                    cy='102.5'
                    r='6.5'
                    fill={theme.centerChannelBg}
                    stroke={theme.centerChannelColor}
                    strokeLinecap='round'
                />
                <Path
                    d='M89 105C88.329 105.623 87.4554 106 86.5 106C85.5446 106 84.671 105.623 84 105'
                    stroke={theme.centerChannelColor}
                    strokeLinecap='round'
                />
                <Circle
                    cx='84'
                    cy='101'
                    r='1'
                    fill={theme.centerChannelColor}
                />
                <Circle
                    cx='89'
                    cy='101'
                    r='1'
                    fill={theme.centerChannelColor}
                />
            </G>
            <Path
                d='M91.3321 75.5L91.332 59.8333L16.5 59.8333L16.5 53'
                stroke={theme.centerChannelColor}
                strokeOpacity='0.32'
                strokeLinecap='round'
            />
            <Path
                d='M89.668 83.9999L86.0013 80.3333L86.0013 67.4999L72.0013 67.4999'
                stroke={theme.centerChannelColor}
                strokeOpacity='0.32'
                strokeLinecap='round'
            />
            <G>
                <Circle
                    cx='91.332'
                    cy='76.6666'
                    r='1.66667'
                    transform='rotate(-180 91.332 76.6666)'
                    fill={theme.centerChannelColor}
                    fillOpacity='0.48'
                />
                <Circle
                    cx='1.66667'
                    cy='1.66667'
                    r='1.66667'
                    transform='matrix(-1 -8.74228e-08 -8.74228e-08 1 92.3307 83)'
                    fill={theme.centerChannelColor}
                    fillOpacity='0.48'
                />
                <Circle
                    cx='1.66667'
                    cy='1.66667'
                    r='1.66667'
                    transform='matrix(-1 -8.74228e-08 -8.74228e-08 1 18.332 50)'
                    fill={theme.centerChannelColor}
                    fillOpacity='0.48'
                />
            </G>
            <Path
                d='M74 19.4755C74 17.0038 76.0038 15 78.4755 15H109.524C111.996 15 114 17.0038 114 19.4755V50.5245C114 52.9962 111.996 55 109.524 55H78.4755C76.0038 55 74 52.9962 74 50.5245V19.4755Z'
                fill='#1C58D9'
                fillOpacity='0.08'
            />
            <Path
                d='M92.9785 22.8036L89.8449 30.1003L81.8047 30.7933L86.5464 34.8697L87.907 36.011L86.0928 43.7969L91.4117 40.5766L92.9785 39.6798L94.5454 40.5766L99.8643 43.7561L98.0501 36.011L99.4107 34.8697L104.152 30.7933L96.1122 30.1003L95.4112 28.4697L92.9785 22.8036Z'
                fill='#1C58D9'
                fillOpacity='0.12'
            />
            <Path
                d='M93.438 22.6063L92.9786 21.5364L92.5191 22.6063L89.5037 29.6279L81.7618 30.2951L80.577 30.3972L81.4787 31.1724L86.2204 35.2488L86.2204 35.2488L86.225 35.2527L87.3504 36.1967L85.6059 43.6834L85.3365 44.8393L86.3518 44.2246L91.6655 41.0075L92.9785 40.2559L94.2929 41.0082L99.6077 44.1853L100.62 44.7905L100.351 43.6421L98.607 36.1964L99.7321 35.2527L99.7321 35.2527L99.7367 35.2488L104.478 31.1724L105.38 30.3972L104.195 30.2951L96.4533 29.6278L95.8707 28.2725L95.8706 28.2723L93.438 22.6063Z'
                stroke={theme.centerChannelColor}
            />
            <Rect
                x={33.5}
                y={22.3334}
                width={43}
                height={79}
                rx={7.5}
                fill={theme.centerChannelBg}
                stroke={theme.centerChannelColor}
                strokeWidth={3}
            />
            <Path
                d='M35 29.3334C35 26.2958 37.4624 23.8334 40.5 23.8334H69.5C72.5376 23.8334 75 26.2958 75 29.3334V30.8334H35V29.3334Z'
                fill='#1E325C'
            />
            <G>
                <Circle
                    cx='44.831'
                    cy='66.6644'
                    r='5.83099'
                    fill={theme.centerChannelColor}
                    fillOpacity='0.32'
                />
                <Path
                    d='M54.5508 64.8334H64.917'
                    stroke={theme.centerChannelColor}
                    strokeOpacity='0.48'
                    strokeLinecap='round'
                />
                <Path
                    d='M40 75.8334H66'
                    stroke={theme.centerChannelColor}
                    strokeOpacity='0.48'
                    strokeLinecap='round'
                />
                <Path
                    d='M40 83.8334H60'
                    stroke={theme.centerChannelColor}
                    strokeOpacity='0.48'
                    strokeLinecap='round'
                />
                <Path
                    d='M54.5508 68.8334H70.748'
                    stroke={theme.centerChannelColor}
                    strokeOpacity='0.48'
                    strokeLinecap='round'
                />
                <Path
                    d='M40 79.8334H56'
                    stroke={theme.centerChannelColor}
                    strokeOpacity='0.48'
                    strokeLinecap='round'
                />
                <Path
                    d='M59 79.8334L71 79.8334'
                    stroke={theme.centerChannelColor}
                    strokeOpacity='0.48'
                    strokeLinecap='round'
                />
            </G>
            <Rect
                x={47}
                y={26.8334}
                width={16}
                height={1}
                rx={0.5}
                fill={theme.centerChannelBg}
            />
            <Path
                d='M28 72L28 84L37 84'
                stroke={theme.centerChannelColor}
                strokeOpacity='0.8'
                strokeLinecap='round'
                strokeLinejoin='round'
            />
            <Path
                d='M28 70L28 66'
                stroke={theme.centerChannelColor}
                strokeOpacity='0.8'
                strokeLinecap='round'
                strokeLinejoin='round'
            />
            <Path
                d='M28 64L28 63'
                stroke={theme.centerChannelColor}
                strokeOpacity='0.8'
                strokeLinecap='round'
                strokeLinejoin='round'
            />
            <Path
                d='M35.6531 36.6599L44.6857 45.6747V1.785C44.6857 0.799172 43.8865 0 42.9007 0H1.91C0.924171 0 0.125 0.799173 0.125 1.785V34.8749C0.125 35.8608 0.924171 36.6599 1.91 36.6599H35.6531Z'
                fill='#CCC4AE'
            />
            <Path
                d='M11.2611 11.1401H24.6293'
                stroke='#090A0B'
                strokeLinecap='round'
            />
            <Path
                d='M11.2611 16.7103H35.7694'
                stroke='#090A0B'
                strokeLinecap='round'
            />
            <Path
                d='M11.2611 23.3943H21.2872'
                stroke='#090A0B'
                strokeLinecap='round'
            />
            <Path
                d='M23.5124 23.3943H33.5385'
                stroke='#090A0B'
                strokeLinecap='round'
            />
        </Svg>
    );
}

export default ReviewAppIllustration;
