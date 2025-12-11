// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import Svg, {Circle, ClipPath, Defs, Ellipse, G, Line, Path, Rect} from 'react-native-svg';

type Props = {
    theme: Theme;
};

const AgentsIntro = ({theme}: Props) => (
    <Svg
        width={138}
        height={119}
        viewBox='0 0 138 119'
        fill='none'
    >
        <G clipPath='url(#clip0_2964_99667)'>
            {/* Background ellipse */}
            <Ellipse
                cx={66}
                cy={59.5}
                rx={59}
                ry={59.5}
                fill={theme.centerChannelColor}
                fillOpacity={0.08}
            />
            {/* Lightbulb fill */}
            <Path
                d='M66.3565 31.33C66.3565 14.2667 52.493 0.436646 35.3921 0.436646C18.2911 0.436646 4.42401 14.2667 4.42401 31.33C4.42401 44.4926 12.6795 55.7246 24.3056 60.1743V73.8752H46.4785V60.1743C58.1046 55.7246 66.3601 44.4926 66.3601 31.33H66.3565Z'
                fill={theme.centerChannelBg}
            />
            {/* Lightbulb stroke */}
            <Path
                d='M24.5002 59.8302L24.1789 59.7072C12.747 55.3317 4.9241 44.2861 4.92401 31.3302C4.92401 14.5443 18.5659 0.936793 35.3918 0.936646C52.2177 0.936646 65.8566 14.5442 65.8566 31.3302V31.6749C65.7056 44.4616 57.1715 55.363 45.8215 59.7072L45.5002 59.8302V73.3751H24.5002V59.8302Z'
                stroke={theme.centerChannelColor}
            />
            {/* Lightbulb base */}
            <Path
                d='M24.5004 79.0001C24.2243 79.0001 24.0004 79.2239 24.0004 79.5001C24.0004 79.7762 24.2243 80.0001 24.5004 80.0001V79.5001V79.0001ZM45.5004 79.5001H46.0004V79.0001H45.5004V79.5001ZM45.5004 86.5001V87.0001H46.0004V86.5001H45.5004ZM27.0004 86.5001V86.0001H26.3894L26.5103 86.599L27.0004 86.5001ZM40.5004 91.0001H41.0004C41.0004 90.8122 40.8951 90.6402 40.7278 90.5547C40.5604 90.4693 40.3593 90.4849 40.2072 90.5951L40.5004 91.0001ZM40.5004 102.5H40.0004V103H40.5004V102.5ZM51.0004 103C51.2766 103 51.5004 102.776 51.5004 102.5C51.5004 102.224 51.2766 102 51.0004 102V102.5V103ZM24.5004 79.5001V80.0001H45.5004V79.5001V79.0001H24.5004V79.5001ZM45.5004 79.5001H45.0004V86.5001H45.5004H46.0004V79.5001H45.5004ZM45.5004 86.5001V86.0001H27.0004V86.5001V87.0001H45.5004V86.5001ZM27.0004 86.5001C26.5103 86.599 26.5104 86.5992 26.5104 86.5994C26.5104 86.5995 26.5105 86.5998 26.5105 86.6C26.5106 86.6005 26.5107 86.6011 26.5109 86.6017C26.5111 86.6031 26.5115 86.6048 26.512 86.607C26.5129 86.6114 26.5141 86.6174 26.5158 86.6251C26.5191 86.6404 26.5239 86.6622 26.5302 86.69C26.5429 86.7457 26.5619 86.8255 26.588 86.9261C26.64 87.1272 26.7203 87.412 26.8343 87.7526C27.0618 88.432 27.4268 89.3426 27.9766 90.2576C29.0731 92.0823 30.958 94.0001 34.0004 94.0001V93.5001V93.0001C31.4555 93.0001 29.8404 91.4178 28.8337 89.7425C28.332 88.9075 27.9946 88.0681 27.7826 87.4351C27.6769 87.1194 27.6031 86.8572 27.5561 86.6756C27.5326 86.5848 27.5158 86.5142 27.5051 86.4673C27.4997 86.4439 27.4959 86.4264 27.4935 86.4152C27.4923 86.4096 27.4915 86.4056 27.491 86.4032C27.4907 86.4021 27.4906 86.4013 27.4905 86.4009C27.4905 86.4008 27.4905 86.4007 27.4905 86.4007C27.4905 86.4008 27.4905 86.4009 27.4905 86.4009C27.4905 86.401 27.4905 86.4012 27.0004 86.5001ZM34.0004 93.5001V94.0001C35.6427 94.0001 37.3526 93.3324 38.6178 92.6968C39.2575 92.3755 39.7986 92.0544 40.1803 91.8135C40.3713 91.6929 40.523 91.592 40.6276 91.5207C40.68 91.4851 40.7206 91.4568 40.7486 91.4371C40.7626 91.4272 40.7734 91.4196 40.781 91.4142C40.7847 91.4115 40.7877 91.4093 40.7898 91.4078C40.7909 91.407 40.7917 91.4064 40.7924 91.406C40.7927 91.4057 40.793 91.4055 40.7932 91.4054C40.7933 91.4053 40.7934 91.4052 40.7935 91.4052C40.7936 91.4051 40.7937 91.405 40.5004 91.0001C40.2072 90.5951 40.2072 90.595 40.2073 90.595C40.2073 90.595 40.2073 90.595 40.2073 90.595C40.2074 90.595 40.2073 90.595 40.2072 90.5951C40.207 90.5952 40.2066 90.5955 40.206 90.5959C40.2048 90.5968 40.2027 90.5983 40.1999 90.6003C40.1942 90.6044 40.1853 90.6107 40.1732 90.6192C40.1492 90.6361 40.1126 90.6615 40.0646 90.6942C39.9686 90.7597 39.8267 90.8541 39.6465 90.9679C39.2856 91.1957 38.7732 91.4997 38.1688 91.8033C36.9459 92.4177 35.4058 93.0001 34.0004 93.0001V93.5001ZM40.5004 91.0001H40.0004V102.5H40.5004H41.0004V91.0001H40.5004ZM40.5004 102.5V103H51.0004V102.5V102H40.5004V102.5Z'
                fill={theme.centerChannelColor}
            />
            {/* Lightbulb internal lines */}
            <Path
                d='M46.8944 21.6719L37.1616 65.0271'
                stroke={theme.centerChannelColor}
                strokeLinecap='round'
            />
            <Path
                d='M23.8895 21.6719L32.7375 65.0271'
                stroke={theme.centerChannelColor}
                strokeLinecap='round'
            />
            {/* Heartbeat line */}
            <Path
                d='M28.3135 23.1465H30.2662L33.1952 17.2478L34.6597 26.0958L37.5887 18.7225L39.0532 23.1465H42.4704'
                stroke={theme.centerChannelColor}
                strokeOpacity={0.8}
                strokeLinecap='round'
                strokeLinejoin='round'
            />
            {/* Checklist background */}
            <Path
                d='M129.835 70.3359H64.8207C63.7162 70.3359 62.8207 71.2314 62.8207 72.3359V109.037C62.8207 110.141 63.7162 111.037 64.8207 111.037H129.835C130.94 111.037 131.835 110.141 131.835 109.037V72.3359C131.835 71.2314 130.94 70.3359 129.835 70.3359Z'
                fill={theme.centerChannelColor}
            />
            {/* Checklist item 1 circle */}
            <Path
                d='M118.5 88C122.09 88 125 85.0898 125 81.5C125 77.9102 122.09 75 118.5 75C114.91 75 112 77.9102 112 81.5C112 85.0898 114.91 88 118.5 88Z'
                fill={theme.centerChannelBg}
                fillOpacity={0.16}
            />
            {/* Checklist item 1 checkmark */}
            <Path
                d='M115.829 81.5628L117.921 83.6545L121.507 80.0687'
                stroke={theme.centerChannelBg}
                strokeWidth={1.35088}
            />
            {/* Checklist item 1 lines */}
            <Path
                d='M71.0002 79.5H106.5'
                stroke={theme.centerChannelBg}
                strokeLinecap='round'
            />
            <Path
                d='M70.9997 84.4927L106.5 84.4927'
                stroke={theme.centerChannelBg}
                strokeLinecap='round'
            />
            {/* Checklist item 2 circle */}
            <Path
                d='M118.5 106C122.09 106 125 103.09 125 99.5C125 95.9102 122.09 93 118.5 93C114.91 93 112 95.9102 112 99.5C112 103.09 114.91 106 118.5 106Z'
                fill={theme.centerChannelBg}
                fillOpacity={0.16}
            />
            {/* Checklist item 2 checkmark */}
            <Path
                d='M115.829 99.2588L117.921 101.351L121.507 97.7648'
                stroke={theme.centerChannelBg}
                strokeWidth={1.35088}
            />
            {/* Checklist item 2 lines */}
            <Path
                d='M70.9997 97.5L107 97.5'
                stroke={theme.centerChannelBg}
                strokeLinecap='round'
            />
            <Path
                d='M70.9997 102.5H107'
                stroke={theme.centerChannelBg}
                strokeLinecap='round'
            />
            {/* Decorative stars */}
            <Path
                fillRule='evenodd'
                clipRule='evenodd'
                d='M127.443 11.443L121 13.5L127.443 15.557L129.5 22L131.557 15.557L138 13.5L131.557 11.443L129.5 5L127.443 11.443Z'
                fill={theme.centerChannelColor}
                fillOpacity={0.16}
            />
            <Path
                fillRule='evenodd'
                clipRule='evenodd'
                d='M79.79 60.169L76 61.5L79.79 62.831L81 67L82.21 62.831L86 61.5L82.21 60.169L81 56L79.79 60.169Z'
                fill={theme.centerChannelColor}
                fillOpacity={0.32}
            />
            <Path
                fillRule='evenodd'
                clipRule='evenodd'
                d='M4.927 97.169L0 98.5L4.927 99.831L6.5 104L8.073 99.831L13 98.5L8.073 97.169L6.5 93L4.927 97.169Z'
                fill={theme.centerChannelColor}
                fillOpacity={0.16}
            />
            {/* Chat bubble fill */}
            <Path
                d='M95.5963 47.8982L88.4805 55V21.0175C88.4805 19.9129 89.3759 19.0175 90.4805 19.0175H122C123.105 19.0175 124 19.9129 124 21.0175V45.8982C124 47.0028 123.105 47.8982 122 47.8982H95.5963Z'
                fill={theme.centerChannelBg}
            />
            {/* Chat bubble overlay */}
            <Path
                d='M95.5963 47.8982L88.4805 55V21.0175C88.4805 19.9129 89.3759 19.0175 90.4805 19.0175H122C123.105 19.0175 124 19.9129 124 21.0175V45.8982C124 47.0028 123.105 47.8982 122 47.8982H95.5963Z'
                fill={theme.centerChannelColor}
                fillOpacity={0.4}
            />
            {/* Chat bubble lines */}
            <Path
                d='M97 27H108'
                stroke={theme.centerChannelColor}
                strokeLinecap='round'
            />
            <Path
                d='M97 32H116'
                stroke={theme.centerChannelColor}
                strokeLinecap='round'
            />
            <Path
                d='M97 37H105'
                stroke={theme.centerChannelColor}
                strokeLinecap='round'
            />
            <Path
                d='M107 37H114'
                stroke={theme.centerChannelColor}
                strokeLinecap='round'
            />
            {/* Magnifying glass circle */}
            <Circle
                cx={124.316}
                cy={48.6583}
                r={10.56}
                stroke={theme.centerChannelColor}
                strokeLinecap='round'
                strokeLinejoin='round'
            />
            {/* Magnifying glass reflection */}
            <Path
                d='M132.72 49.1007C132.72 53.4987 129.155 57.0639 124.757 57.0639'
                stroke={theme.centerChannelColor}
                strokeOpacity={0.32}
                strokeLinecap='round'
                strokeLinejoin='round'
            />
            {/* Magnifying glass handle */}
            <Line
                x1={117.559}
                y1={57.2736}
                x2={111.309}
                y2={63.5239}
                stroke={theme.centerChannelColor}
                strokeLinecap='round'
                strokeLinejoin='round'
            />
            {/* Bottom decorative lines */}
            <Path
                d='M55 102.5H57'
                stroke={theme.centerChannelColor}
                strokeLinecap='round'
            />
            <Path
                d='M60 102.5H65'
                stroke={theme.centerChannelColor}
                strokeLinecap='round'
            />
            {/* Decorative arcs around lightbulb */}
            <Path
                d='M60.5145 5.86743C67.9401 13.5398 71.9243 24.403 70.4339 35.8131C69.2488 44.8855 64.8075 52.7348 58.4392 58.3388'
                stroke={theme.centerChannelColor}
                strokeOpacity={0.32}
                strokeLinecap='round'
            />
            <Path
                d='M63 62C71.6023 54.3833 77 43.414 77 31.2209C77 25.4668 75.7979 19.9853 73.6243 15'
                stroke={theme.centerChannelColor}
                strokeOpacity={0.32}
                strokeLinecap='round'
                strokeDasharray='2 2'
            />
        </G>
        <Defs>
            <ClipPath id='clip0_2964_99667'>
                <Rect
                    width={138}
                    height={119}
                    fill={theme.centerChannelBg}
                />
            </ClipPath>
        </Defs>
    </Svg>
);

export default AgentsIntro;
