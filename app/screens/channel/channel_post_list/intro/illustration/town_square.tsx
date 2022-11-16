// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import * as React from 'react';
import Svg, {
    G,
    Path,
    Mask,
    Ellipse,
    Defs,
    Pattern,
    Use,
    Image,
    LinearGradient,
    Stop,
    ClipPath,
} from 'react-native-svg';

type Props = {
    theme: Theme;
};

const TownSquareIllustration = ({theme}: Props) => (
    <Svg
        width={152}
        height={149}
        viewBox='0 0 152 149'
    >
        <G clipPath='url(#clip0_653_17815)'>
            <Path
                d='M136.746 83.662a48.299 48.299 0 0010.837-15.674 48.105 48.105 0 00.301-37.313A48.288 48.288 0 00137.3 14.831a48.502 48.502 0 00-15.909-10.543 48.671 48.671 0 00-37.468.293 48.499 48.499 0 00-15.741 10.79l-90.332 89.943 68.576 68.292 90.32-89.944z'
                fill='url(#paint0_linear_653_17815)'
                fillOpacity={0.12}
            />
            <Path
                d='M64.676 141.347c-.137-1.75.912-3.896 2.588-6.47.302-.464.62-.944.957-1.43 3.317-4.829 8.276-11.025 11.82-18.846 6.219-13.73 4.56-36.042 2.73-48.183 0 0-10.543-3.558-15.445 1.396a5.358 5.358 0 00-.535.573c-2.28 2.912-1.904 9.382.381 17.666 3.677 13.342 3.789 19.778 2.204 25.47-1.368 4.921-4.027 9.297-6.421 17.089a253.545 253.545 0 00-1.203 3.988c-1.071 3.684-1.556 5.812-1.624 7.123 1.51.583 3.032 1.104 4.548 1.624z'
                fill='#AD831F'
            />
            <Path
                d='M61.998 131.81l.952.332.398.137 2.85 1.007a3.143 3.143 0 011.448 1.03c3.294-4.943 8.652-11.442 12.407-19.715 6.219-13.73 4.56-36.043 2.73-48.183 0 0-11.364-3.839-15.958 1.997-2.28 2.912-1.904 9.383.382 17.667 6.84 24.863.952 25.745-4.218 42.565a84.167 84.167 0 00-.991 3.163z'
                fill={theme.buttonBg}
            />
            <Path
                d='M61.998 131.81l.952.332.398.137 2.85 1.007a3.143 3.143 0 011.448 1.03c3.294-4.943 8.652-11.442 12.407-19.715 6.219-13.73 4.56-36.043 2.73-48.183 0 0-11.364-3.839-15.958 1.997-2.28 2.912-1.904 9.383.382 17.667 6.84 24.863.952 25.745-4.218 42.565a84.167 84.167 0 00-.991 3.163z'
                fill='#000'
                fillOpacity={0.16}
            />
            <Mask
                id='a'

                // @ts-expect-error style not intrinsic
                style={{
                    maskType: 'alpha',
                }}
                maskUnits='userSpaceOnUse'
                x={61}
                y={65}
                width={24}
                height={70}
            >
                <Path
                    d='M61.998 131.81l.952.332.398.137 2.85 1.007a3.143 3.143 0 011.448 1.03c3.294-4.943 8.652-11.442 12.407-19.715 6.219-13.73 4.56-36.043 2.73-48.183 0 0-11.364-3.839-15.958 1.997-2.28 2.912-1.904 9.383.382 17.667 6.84 24.863.952 25.745-4.218 42.565a84.167 84.167 0 00-.991 3.163z'
                    fill='#1452BD'
                />
            </Mask>
            <G mask='url(#a)'>
                <Path
                    transform='matrix(-1 0 0 1 84.578 65.025)'
                    fill='url(#pattern0)'
                    d='M0 0H22.6783V69.302H0z'
                />
            </G>
            <Path
                d='M64.722 138.635c.142.049.29.083.439.103a5.111 5.111 0 000 3.479c.398 1.253 1.299 2.906 1.578 3.747.85 2.546-.034 2.249-2.656-1.373-2.621-3.621-4.958-1.207-3.55-7.437 1.402.492 2.798.986 4.189 1.481z'
                fill='#1E325C'
            />
            <Path
                d='M33.17 112.456c2.94-4.445-.513-3.353 8.138.475.485.223 1.02.446 1.59.681l1.266.509c10.259 4.005 19.121 2.775 25.106-2.563a20.228 20.228 0 003.112-3.507c5.3-7.546 3.174-24.029-5.056-40.23a87.547 87.547 0 00-2.24-4.131l-11.33-7.558s-7.78 8.261 2.28 29.24c9.586 20.024-1.169 21.678-11.718 20.905a65.908 65.908 0 01-1.533-.126h-.166c-10.829-1.018-9.46-2.076-10.686 3.238-1.226 5.315-1.99 7.936 1.237 3.067z'
                fill='#AD831F'
            />
            <Path
                d='M41.986 113.234c.662.28 1.385.572 2.178.887 12.23 4.754 22.461 2.116 28.218-6.076 5.756-8.193 2.753-26.93-7.296-44.361l-11.33-7.558s-7.78 8.261 2.28 29.24c9.945 20.757-1.995 21.775-12.892 20.808-.114.618-.228 1.242-.337 1.865 0 .143-.051.286-.068.429-.131.733-.251 1.459-.365 2.191 0 .138-.046.286-.068.424-.114.715-.217 1.413-.32 2.151z'
                fill={theme.buttonBg}
            />
            <Path
                d='M31.933 109.367c.992-4.303.307-4.428 5.7-3.782a224.73 224.73 0 00-.833 5.046c-2.85-1.716-1.442-1.51-3.648 1.825-3.208 4.869-2.456 2.254-1.22-3.089z'
                fill='#1E325C'
            />
            <Path
                d='M71.333 34.192a31.622 31.622 0 00-1.778-8.622c-1.191-3.004-3.568-5.355-4.617-5.24-2.399.251-4.229-.727-5.09.635-.694 1.224.103 7.82.879 8.38.564.29 1.167.499 1.79.619l.997 5.4 7.82-1.172z'
                fill='#AD831F'
            />
            <Path
                d='M60.698 23.502c-1.178 1.434-1.97 2.489-1.97 2.489-.077.6 1.927.907 1.927.907l.043-3.396z'
                fill='#AD831F'
            />
            <Path
                d='M64.06 29.54c-.808.23-1.659.268-2.484.109-.314-.063.632.315.946.378.923.183.752.257 1.658 0 .325-.07.211-.555-.12-.487z'
                fill='#8B6918'
            />
            <Path
                d='M69.674 19.185c1.095.818 1.887 3.433 2.28 4.743.394 1.31-.393 2.575-.53 3.936a1.723 1.723 0 01-.627 1.39c-.7.412-1.556-.269-1.938-.99-.381-.72-.632-1.607-1.356-1.979-.519-.269-1.254-.246-1.539-.76-.24-.424 0-.968-.154-1.431-.188-.612-.912-.853-1.533-.996l-3.71-.88a5.237 5.237 0 01-1.99-.773 1.594 1.594 0 01-.733-1.904 1.585 1.585 0 011.731-1.071c.832 0 1.448.48 2.217.658a11.17 11.17 0 002.354 0c1.624.006 4.15-.973 5.528.057z'
                fill='#4A2407'
            />
            <Path
                d='M19.713 21.53c2.006.212 3.904 2.861 6.435 7.867 2.53 5.006 8.65 11.078 15.49 7.268 6.84-3.81 12.437-3.28 20.787-3.32 1.419-.12 10.487-.143 12.413.074 14.152.47 15.115 15.144 22.467 14.269 9.37-1.145 8.151-11.872 12.63-14.515 4.48-2.643 3.238-.715 1.83-.046-1.408.67 0 1.305-.673 4.657-.672 3.353-.484 15.19-9.216 19.32-6.377 3.015-14.024-.223-19.74-4.73.034 1.143-.046 2.471 0 3.752.233 6.689 2.046 11.055 2.08 13.624-8.394-.282-16.593.09-24.966.753-2.148.115-6.997.488-9.152.637 0 0 .462-4.098.833-9.453.512-7.386.243-11.03.648-15.172-15.286 4.72-25.249-4.823-27.358-9.206-4.046-8.46-3.311-11.522-3.374-12.797-.102-2.054-3.135-3.21-1.134-2.981z'
                fill='#AD831F'
            />
            <Path
                d='M40.334 37.115c.307 3.524.792 8.479 2.006 11.494a44.206 44.206 0 011.784-.155l.422-.028.968-.069.422-.034a23.295 23.295 0 005.033-.99 35.185 35.185 0 00-.126 3.845v.423c0 .726.035 1.476.057 2.288v3.988c0 1.144-.08 2.414-.182 3.862a110.54 110.54 0 01-.222 2.826c0 .143 0 .292-.04.429-.063.744-.137 1.436-.205 2.077 0 .143 0 .28-.04.417-.262 2.357-.479 3.862-.479 3.862 2.143-.149 7.352-.76 9.513-.875a223.596 223.596 0 0125.157-.572 14.27 14.27 0 00-.433-2.827c0-.143-.063-.291-.103-.44-.091-.412-.194-.853-.296-1.316l-.103-.44a45.942 45.942 0 01-.387-1.808 51.088 51.088 0 01-.428-2.42 39.576 39.576 0 01-.37-3.57v-.43V55.25c-.035-.96-.063-1.876-.086-2.75l2.514 1.996.33.263.57.446.325.263c.946.744 1.664 1.305 1.71 1.305 2.787-2.598 4.035-7.312 5.09-10.928a17.149 17.149 0 01-1.46-1.578c-.114-.126-.216-.258-.324-.39a56.887 56.887 0 01-.81-1.012l-.342-.44c-.085-.11-.165-.218-.256-.327-2.377-3.02-5.198-6.442-9.98-7.923a17.389 17.389 0 00-1.67-.43 17.96 17.96 0 00-1.835-.263l-.462-.04c-.205 0-.416 0-.627-.034h-.051c-.217 0-.57-.046-.929-.069a2.477 2.477 0 01-.177.275c-3.91 5.349-9.945 3.793-13.678-.286h-2.371c-1.505 0-2.936 0-4.315.068a26.333 26.333 0 00-9.404 1.963l-.405.171c-.347.16-.695.326-1.043.504l-.404.2a6.75 6.75 0 00-.57.326 9.622 9.622 0 01-1.288.555z'
                fill={theme.centerChannelBg}
            />
            <Path
                d='M40.334 37.115c.307 3.524.792 8.479 2.006 11.494a44.206 44.206 0 011.784-.155l.422-.028.968-.069.422-.034a23.295 23.295 0 005.033-.99 35.185 35.185 0 00-.126 3.845v.423c0 .726.035 1.476.057 2.288v3.988c0 1.144-.08 2.414-.182 3.862a110.54 110.54 0 01-.222 2.826c0 .143 0 .292-.04.429-.063.744-.137 1.436-.205 2.077 0 .143 0 .28-.04.417-.262 2.357-.479 3.862-.479 3.862 2.143-.149 7.352-.76 9.513-.875a223.596 223.596 0 0125.157-.572 14.27 14.27 0 00-.433-2.827c0-.143-.063-.291-.103-.44-.091-.412-.194-.853-.296-1.316l-.103-.44a45.942 45.942 0 01-.387-1.808 51.088 51.088 0 01-.428-2.42 39.576 39.576 0 01-.37-3.57v-.43V55.25c-.035-.96-.063-1.876-.086-2.75l2.514 1.996.33.263.57.446.325.263c.946.744 1.664 1.305 1.71 1.305 2.787-2.598 4.035-7.312 5.09-10.928a17.149 17.149 0 01-1.46-1.578c-.114-.126-.216-.258-.324-.39a56.887 56.887 0 01-.81-1.012l-.342-.44c-.085-.11-.165-.218-.256-.327-2.377-3.02-5.198-6.442-9.98-7.923a17.389 17.389 0 00-1.67-.43 17.96 17.96 0 00-1.835-.263l-.462-.04c-.205 0-.416 0-.627-.034h-.051c-.217 0-.57-.046-.929-.069a2.477 2.477 0 01-.177.275c-3.91 5.349-9.945 3.793-13.678-.286h-2.371c-1.505 0-2.936 0-4.315.068a26.333 26.333 0 00-9.404 1.963l-.405.171c-.347.16-.695.326-1.043.504l-.404.2a6.75 6.75 0 00-.57.326 9.622 9.622 0 01-1.288.555z'
                fill={theme.centerChannelColor}
                fillOpacity={0.08}
            />
            <Mask
                id='b'

                // @ts-expect-error style not intrinsic
                style={{
                    maskType: 'alpha',
                }}
                maskUnits='userSpaceOnUse'
                x={40}
                y={33}
                width={53}
                height={39}
            >
                <Path
                    d='M40.334 37.115c.307 3.524.792 8.479 2.006 11.494a44.206 44.206 0 011.784-.155l.422-.028.968-.069.422-.034a23.295 23.295 0 005.033-.99 35.185 35.185 0 00-.126 3.845v.423c0 .726.035 1.476.057 2.288v3.988c0 1.144-.08 2.414-.182 3.862a110.54 110.54 0 01-.222 2.826c0 .143 0 .292-.04.429-.063.744-.137 1.436-.205 2.077 0 .143 0 .28-.04.417-.262 2.357-.479 3.862-.479 3.862 2.143-.149 7.352-.76 9.513-.875a223.596 223.596 0 0125.157-.572 14.27 14.27 0 00-.433-2.827c0-.143-.063-.291-.103-.44-.091-.412-.194-.853-.296-1.316l-.103-.44a45.942 45.942 0 01-.387-1.808 51.088 51.088 0 01-.428-2.42 39.576 39.576 0 01-.37-3.57v-.43V55.25c-.035-.96-.063-1.876-.086-2.75l2.514 1.996.33.263.57.446.325.263c.946.744 1.664 1.305 1.71 1.305 2.787-2.598 4.035-7.312 5.09-10.928a17.149 17.149 0 01-1.46-1.578c-.114-.126-.216-.258-.324-.39a56.887 56.887 0 01-.81-1.012l-.342-.44c-.085-.11-.165-.218-.256-.327-2.377-3.02-5.198-6.442-9.98-7.923a17.389 17.389 0 00-1.67-.43 17.96 17.96 0 00-1.835-.263l-.462-.04c-.205 0-.416 0-.627-.034h-.051c-.217 0-.57-.046-.929-.069a2.477 2.477 0 01-.177.275c-3.91 5.349-9.945 3.793-13.678-.286h-2.371c-1.505 0-2.936 0-4.315.068a26.333 26.333 0 00-9.404 1.963l-.405.171c-.347.16-.695.326-1.043.504l-.404.2a6.75 6.75 0 00-.57.326 9.622 9.622 0 01-1.288.555z'
                    fill={theme.centerChannelBg}
                />
            </Mask>
            <G mask='url(#b)'>
                <Path
                    transform='matrix(-1 0 0 1 92.874 33.146)'
                    fill='url(#pattern1)'
                    d='M0 0H52.5472V38.2547H0z'
                />
            </G>
            <Path
                d='M50.233 67.494c11.263-.75 22.548-2.214 33.758-.424 0-.142-.062-.291-.102-.44-11.165-1.745-22.393-.303-33.627.446 0 .143-.017.28-.029.418zM50.479 65.01a121.35 121.35 0 0133.114.316l-.103-.44a121.905 121.905 0 00-32.971-.304c-.012.132-.023.28-.04.429zM50.912 53.89v.423c10.47-.647 21.054 1.047 31.381 2.763v-.43c-10.339-1.721-20.917-3.392-31.381-2.757zM50.843 51.177v.424A127.255 127.255 0 0182.1 55.645a.199.199 0 00.131 0v-.389a127.673 127.673 0 00-31.387-4.079zM58.162 33.316c1.276 3.067 3.322 5.721 6.964 5.939 4.155.28 9.12-1.848 10.864-5.779l-.462-.04c-1.75 3.69-6.452 5.67-10.402 5.395-3.39-.229-5.306-2.66-6.52-5.515h-.444zM42.14 36.223a184.49 184.49 0 001.984 12.231l.421-.028a169.144 169.144 0 01-2-12.404l-.405.2zM85.559 55.2l.325.263a37.146 37.146 0 005.329-11.202c-.114-.126-.217-.258-.325-.39a36.893 36.893 0 01-5.33 11.328zM89.708 42.418A29.965 29.965 0 0184.63 54.49l.33.263a30.38 30.38 0 005.09-11.894l-.342-.44zM43.588 35.519a106.98 106.98 0 001.926 12.838l.422-.034a107.128 107.128 0 01-1.943-12.976l-.405.172z'
                fill='#fff'
                fillOpacity={0.16}
            />
            <Path
                d='M61.53 23.322h2.622c1.425.063 2.086.286 2.787 1.596.125.223-.251.372-.37.143a2.076 2.076 0 00-1.71-1.305 21.654 21.654 0 00-2.2-.08h-1.072c-.029-.103-.04-.229-.057-.354z'
                fill={theme.centerChannelBg}
            />
            <Path
                d='M61.21 24.963a1.596 1.596 0 00.463-1.647c-.2-.847-.895-1.408-1.545-1.253-.65.154-1.026.973-.826 1.82.2.846.894 1.407 1.55 1.252a.95.95 0 00.359-.172zm-1.213-2.402a.67.67 0 01.222-.109c.44-.103.918.326 1.066.961.148.635-.085 1.23-.524 1.333-.44.103-.918-.326-1.072-.955a1.217 1.217 0 01.337-1.213l-.03-.017z'
                fill={theme.centerChannelBg}
            />
            <Path
                d='M72.98 24.277c1.556 0 2.667 1.825 3.152 3.764.365 1.454 2.599 1.745 4.064 1.442 1.55-.314 2.804-1.67 4.383-1.716 1.14-.04 2.177.623 3.197 1.144 1.02.52 2.28.95 3.283.435 1.14-.572 1.561-2.043 2.696-2.569 1.134-.526 2.53.132 3.46 1.013a8.365 8.365 0 012.553 5.235 5.052 5.052 0 01-.52 3.009 2.856 2.856 0 01-2.53 1.499c-1.282-.08-2.382-1.23-3.659-1.081a2.888 2.888 0 00-1.8 1.144c-.457.572-.804 1.218-1.266 1.785a5.607 5.607 0 01-2.706 1.816 5.588 5.588 0 01-3.256.001 5.606 5.606 0 01-2.708-1.814 5.64 5.64 0 01-1.247-3.018c-.074-.75 0-1.562-.433-2.18-.57-.83-1.71-.956-2.696-.938-.986.017-2.092.074-2.85-.572-1.63-1.385-.2-4.549-1.807-5.956a5.65 5.65 0 00-1.367-.744c-.627-.303-1.79-1.527-.667-1.95.365-.132.974.108 1.34.154.458.064.92.096 1.384.097z'
                fill='#4A2407'
            />
            <Mask
                id='c'

                // @ts-expect-error style not intrinsic
                style={{
                    maskType: 'alpha',
                }}
                maskUnits='userSpaceOnUse'
                x={69}
                y={23}
                width={31}
                height={19}
            >
                <Path
                    d='M72.98 24.277c1.556 0 2.667 1.825 3.152 3.764.365 1.454 2.599 1.745 4.064 1.442 1.55-.314 2.804-1.67 4.383-1.716 1.14-.04 2.177.623 3.197 1.144 1.02.52 2.28.95 3.283.435 1.14-.572 1.561-2.043 2.696-2.569 1.134-.526 2.53.132 3.46 1.013a8.365 8.365 0 012.553 5.235 5.052 5.052 0 01-.52 3.009 2.856 2.856 0 01-2.53 1.499c-1.282-.08-2.382-1.23-3.659-1.081a2.888 2.888 0 00-1.8 1.144c-.457.572-.804 1.218-1.266 1.785a5.607 5.607 0 01-2.706 1.816 5.588 5.588 0 01-3.256.001 5.606 5.606 0 01-2.708-1.814 5.64 5.64 0 01-1.247-3.018c-.074-.75 0-1.562-.433-2.18-.57-.83-1.71-.956-2.696-.938-.986.017-2.092.074-2.85-.572-1.63-1.385-.2-4.549-1.807-5.956a5.65 5.65 0 00-1.367-.744c-.627-.303-1.79-1.527-.667-1.95.365-.132.974.108 1.34.154.458.064.92.096 1.384.097z'
                    fill='#66320A'
                />
            </Mask>
            <G mask='url(#c)'>
                <Path
                    transform='matrix(-1 0 0 1 100.065 23.721)'
                    fill='url(#pattern2)'
                    d='M0 0H30.4221V17.7413H0z'
                />
            </G>
            <Path
                d='M71.47 26.897c.11-.838.147-1.684.114-2.528-.04-1.087 1.647-1.087 1.71 0 .028.996-.029 1.994-.171 2.98a.852.852 0 01-1.038.572.866.866 0 01-.615-1.024z'
                fill={theme.centerChannelBg}
            />
            <G clipPath='url(#clip1_653_17815)'>
                <Path
                    d='M10.85 5.569L9.146 1.55a.266.266 0 00-.413-.104l-1.085.67a.345.345 0 00-.051.465l2.742 3.295a.367.367 0 00.413.05.357.357 0 00.104-.358h-.004zm-2.635 2.06a.324.324 0 01-.465.103L2.946 5.258c-.208-.136-.241-.326-.104-.566l.878-1.34a.408.408 0 01.568-.05l3.876 3.862a.345.345 0 01.05.464zm-.878 2.522l-4.03-1.648c-.197-.068-.328 0-.361.207l-.259 1.236a.276.276 0 00.259.36l4.287.413c.137 0 .241-.086.31-.258a.333.333 0 00-.206-.31z'
                    fill='#FFBC1F'
                />
                <Path
                    d='M17.16 25.963l.826.462a1.3 1.3 0 001.06.157c.361-.104.667-.344.852-.67l2.22-3.71a1.398 1.398 0 00-.514-1.952l-.827-.465a1.299 1.299 0 00-1.06-.154 1.43 1.43 0 00-.851.67l-2.223 3.71a1.682 1.682 0 00-.13 1.106 1.328 1.328 0 00.647.846z'
                    fill='#28427B'
                />
                <Path
                    d='M26.818 19.696c.916-1.656 1.258-4.143.152-4.961L19.686 9.38l-5.484 8.549 8.009 4.326c1.463.716 3.691-.903 4.607-2.56z'
                    fill={theme.buttonBg}
                />
                <Path
                    d='M9.717 9.018a26.453 26.453 0 00-2.713 5.408c-.568 1.648-.628 2.66-.18 3.038.586.275 1.5-.189 2.742-1.39 1.242-1.201 2.49-2.78 3.747-4.738 1.257-1.953 2.171-3.747 2.742-5.383.57-1.636.614-2.657.13-3.063-.55-.24-1.455.24-2.713 1.44a25.859 25.859 0 00-3.755 4.688z'
                    fill='#82889C'
                />
                <Path
                    d='M6.716 17.363c.175.412.535.652 1.085.72 2.486.131 5.782.488 7.441.617 1.66.129 3.982-2.135 4.599-3.192.617-1.057 1.995-3.76 1.032-5.513-.962-1.753-2.598-4.278-3.77-6.49-.276-.445-.621-.652-1.034-.617a.406.406 0 01.155.05c.412.344.309 1.32-.31 2.93a30.11 30.11 0 01-2.791 5.33 29.776 29.776 0 01-3.668 4.763c-1.206 1.236-2.067 1.752-2.584 1.546a.348.348 0 01-.155-.154v.01z'
                    fill='#DDDFE4'
                />
                <Path
                    opacity={0.5}
                    d='M25.317 16.949a.69.69 0 00.414.156.647.647 0 00.568-.31.779.779 0 00.154-.586.62.62 0 00-.31-.438l-2.996-1.905a.707.707 0 00-.587-.129.714.714 0 00-.441.334.76.76 0 00-.102.54.61.61 0 00.31.438l2.996 1.906-.006-.006z'
                    fill={theme.centerChannelBg}
                    fillOpacity={0.48}
                />
            </G>
            <Ellipse
                cx={71.9496}
                cy={147.747}
                rx={26.4894}
                ry={1.33551}
                fill='#000'
                fillOpacity={0.12}
            />
            <G clipPath='url(#clip2_653_17815)'>
                <Path
                    d='M102.694 52.252h38.571a5.46 5.46 0 012.062.397 5.392 5.392 0 011.75 1.142c.501.49.9 1.073 1.173 1.715a5.23 5.23 0 01.416 2.026v24.126a5.23 5.23 0 01-.416 2.025 5.307 5.307 0 01-1.173 1.715 5.392 5.392 0 01-1.75 1.143 5.46 5.46 0 01-2.062.396h-5.692v9.031l-8.539-9.03h-24.327a5.458 5.458 0 01-2.061-.397 5.39 5.39 0 01-1.75-1.143 5.293 5.293 0 01-1.173-1.715 5.224 5.224 0 01-.416-2.026V57.532a5.256 5.256 0 011.584-3.736 5.428 5.428 0 013.803-1.544z'
                    fill='#FFBC1F'
                />
                <Path
                    d='M127.034 86.937h-24.327a5.458 5.458 0 01-2.061-.396 5.39 5.39 0 01-1.75-1.143 5.294 5.294 0 01-1.173-1.715 5.225 5.225 0 01-.416-2.026V67.011s1.698 13.544 2.003 14.736c.305 1.192.911 2.976 3.78 3.272 2.869.296 23.944 1.918 23.944 1.918z'
                    fill='#CC8F00'
                />
                <Path
                    d='M135.154 66.146c-.687 0-1.359.2-1.93.576a3.429 3.429 0 00-1.28 1.535 3.37 3.37 0 00-.198 1.976c.134.663.465 1.272.951 1.75a3.493 3.493 0 001.779.936 3.529 3.529 0 002.008-.194 3.464 3.464 0 001.559-1.26 3.38 3.38 0 00-.431-4.319 3.47 3.47 0 00-1.127-.741 3.519 3.519 0 00-1.331-.26zM121.979 66.146c-.687 0-1.359.2-1.93.576a3.429 3.429 0 00-1.28 1.535 3.37 3.37 0 00-.198 1.976c.134.663.465 1.272.951 1.75a3.493 3.493 0 001.779.936 3.529 3.529 0 002.008-.194 3.464 3.464 0 001.559-1.26 3.38 3.38 0 00-.431-4.319 3.47 3.47 0 00-1.127-.741 3.519 3.519 0 00-1.331-.26zM108.819 66.146c-.687-.001-1.36.199-1.932.574a3.426 3.426 0 00-1.281 1.534 3.363 3.363 0 00-.2 1.976c.134.663.464 1.273.95 1.752a3.494 3.494 0 001.779.937 3.526 3.526 0 002.008-.194 3.464 3.464 0 001.56-1.26 3.381 3.381 0 00-.429-4.317 3.473 3.473 0 00-1.126-.742 3.518 3.518 0 00-1.329-.26z'
                    fill={theme.centerChannelBg}
                />
                <Path
                    d='M142.663 62.354a10.693 10.693 0 00-1.949-3.753 10.88 10.88 0 00-3.265-2.727.37.37 0 01.155-.704c2.432-.144 7.341.367 5.802 7.148a.384.384 0 01-.743.036z'
                    fill='#FFD470'
                />
            </G>
        </G>
        <Defs>
            <Pattern
                id='pattern0'
                patternContentUnits='objectBoundingBox'
                width={1}
                height={1}
            >
                <Use
                    xlinkHref='#image0_653_17815'
                    transform='scale(.0122 .004)'
                />
            </Pattern>
            <Pattern
                id='pattern1'
                patternContentUnits='objectBoundingBox'
                width={1}
                height={1}
            >
                <Use
                    xlinkHref='#image1_653_17815'
                    transform='scale(.00526 .00725)'
                />
            </Pattern>
            <Pattern
                id='pattern2'
                patternContentUnits='objectBoundingBox'
                width={1}
                height={1}
            >
                <Use
                    xlinkHref='#image2_653_17815'
                    transform='scale(.0091 .01563)'
                />
            </Pattern>
            <LinearGradient
                id='paint0_linear_653_17815'
                x1={64.675}
                y1={0.683517}
                x2={-44.8163}
                y2={110.636}
                gradientUnits='userSpaceOnUse'
            >
                <Stop
                    offset={0.0104167}
                    stopColor={theme.buttonBg}
                />
                <Stop
                    offset={0.765625}
                    stopColor={theme.buttonBg}
                    stopOpacity={0}
                />
            </LinearGradient>
            <ClipPath id='clip0_653_17815'>
                <Path
                    fill={theme.centerChannelBg}
                    transform='translate(.5)'
                    d='M0 0H151V149H0z'
                />
            </ClipPath>
            <ClipPath id='clip1_653_17815'>
                <Path
                    fill={theme.centerChannelBg}
                    transform='matrix(-1 0 0 1 27.834 1.39)'
                    d='M0 0H25.1545V25.2417H0z'
                />
            </ClipPath>
            <ClipPath id='clip2_653_17815'>
                <Path
                    fill={theme.centerChannelBg}
                    transform='matrix(-1 0 0 1 157.677 38.959)'
                    d='M0 0H71.3818V70.3991H0z'
                />
            </ClipPath>
            <Image
                id='image0_653_17815'
                width={82}
                height={250}
                xlinkHref='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFIAAAD6CAYAAAAyYxAYAAAdAUlEQVR4Xu2da5PsRpGGSws2YGzuGLPc/WH3//8dILgZe3EYA8ZesMFrbTwZmRVZqSpVdY+mpe7RiXAcnxmNpvUqK69vZk7p/LMJAtMmdzlvkk4gNxKCE8gTyI0Q2Og2p0SeQG6EwEa3OSXyBHIjBDa6zSmRJ5AbIbDRbU6JPIHcCIGNbnNK5AnkRghsdJtTIk8gN0Jgo9ucEnkCuRECG93mlMgTyI0Q2Og2p0SeQG6EwEa3OSXyBHIjBDa6zSmRJ5AbIbDRbU6JPIHcCIGNbnNK5AnkRghsdJtTIk8gN0Jgo9ucEnkCuRECG93mlMgTyI0Q2Og2p0SeQG6EwEa3OSXyBHIjBDa6zSmRJ5AbIbDRbU6JPIHcCIGNbnNK5AnkRghsdJtTIk8gN0Jgo9ucEnkCuRECG93mISVynufvTdP0540wGrrNQwI59OQbX3QCuRGgJ5AnkBshsNFt7lYi53n+Tkrpf6dp+uxaLOZ5/o9pmr649uf9z90tkFs8/DzP304pfTZN0z+eer/DAYmUpJS+NE3Tvy99uOj2zPP8Wkrp062kbu3zHBHIL6WUXp+m6aMrgCyO6jzPbyiQF7+US3/34YC85AFU4v59jfRe8ntGrr13IF85AogAfZdAzvP8nymlP91C941a9rsAcp7n19W6iq4bfTi99jWs8jzPX0kpIcGfjBxVu2ae569O0/Rp72duDuQlILiHeUWOT8eSz/PMdQAnhmqeZwzXN6dp+ssaEEj4NE3v9cA6lNWe5/nHKaUPnuJIP+WBMVDRb7zm5cbPcHOJfAoITkK/P03TByp1vJiPpmn62H1/AZaX7p5kX/MZDwekHscvm8TO8/yDaZre7xzNwomvSd014FzyM4cDMhqT3rHTSIi4+4uoC+d5/mZK6R89CVR/FEN0cRBgYB8SyJokqCH5lh1pd1QB6/+wxhrJkMgoEhHxZXAvD67em7B0YZ31e0RMq8mRwwKpD/CVmrtiMTTuDHG5AvkZsbbqyyIkRD2ogROAkdRR6VNV0w1ZjwwkAM0pJeLl4ngqkIBC9obaDBKZpVCPNKEj/iNgF99XMPn6Gz3XaFRP7gokTnLvyMRj2Dj2SAxHu+bafJUX0vs9o4C1rtsbyB9P0/THoO9EkhqAVYEfjT56YHGfa0HfFcjeg/nvr0Upli1PKX2eUsJdeo+vcWxrVj/qSLtGdSyJ3uyTjn7GQwMZj766Oui1jzT+/hxLO8/z2ymlf07T9D/+eKsuJVaWELHlk25RBz8skGokOPq/jVJhlhQjgiFSg/RxMDiLFFuMxUelbeS6wwCpPiBGIWdnVGdxRBcJBc3m4Ih/wlHUf7+qOg7DYwYoZ82fM+LZFUh1U8jqVCMKlaCFixJ9O/03PiSuEMBlP9LryKcaJVUVuFIL53xvIIfLoSqxHFcMCL5lEcGozuQU4k8KkAaouVAKuBijirooyrt6P/xX759WfVL5XSPn/9bXuAevAl0J8Uj8oiupGmK5+YOzDghIO0kQURlrUtmL69dwOCqQkpU2a9qQQKRDYuB5nnNazfmkoiMb/qjXm0gihupJlcabAtnTUZW6tAFaRCzqBmFYSJ/xH5JnIZ84+M6PNKODs80fLD0GTFJzW9W+bw1kM+EaohuK+tVsi4L49jRNv1YgJBepP8/RFjdIARKdqdLd1G8e+GvV2E2BbH1Ic1UqBqDI0qixALiYpABAgEJP2nH36bXsU6qn0HxR9w5kVVKj3xeiFimIpZQ4suQR0XV/cZYaIE06f5ZSekcl9Vlq4UeRyIKmoscScAv6stexRoByABaJjpqUu5gaCcY9ejJ5yiT4EEBWjjTONdLlfTgkD0ORs9U+Fjfj4nTtIlPkkxXRUdf7ZmAvdYWeDUgN79BlXbdCdR8P7h9EgLDoRv3Bn6aUsMoAihST+X5PjyxOOl/nbzniAeha7N1kvl2ayHhOIHGIyS362HmVaaYWmSOH1c25SnckzZUR0Ax4owIqkCKUeg8km89AtigzJtz9CkLBtYZGft9TfvjSn1XJIzFhtRMkgofBRUGCMBAUoRbMCOc7Un4AHH/sCy5QMEoLysmWBNNddaQC+jX4PGoscEcWiQtvMFRVoCYAXxIZmtDFYhextfqFSP+b5Cj1389irY8AZJGlqUm3SiEWFinleKITAeSP+j1OFP/OZVTzE/W08TtE747Ufi49Yf76mx7t0Q+qEksY94EaG8nkWCFf/UY+ezZmTso58gBr0Y6wdlsUaCMRuLJu1zjWnmN3IBWAb1d8RolqVPK+bnUUZygWTDNvad11FkLCOPv9SnSF5F/N/r05kJaErfF5fBbH3CfVoUYCyBygWH/R+2LpBax5nolm/raSNEZNkG8sCl2jVMD4Qm4C5IhPZkX/SBupuSpKDQQArD1lBiz/txQ4I6OuSliLOKAvoZtc2QvIbia8V09Rl+Xr5oDrAwtJStNobyqr1yqGiyz6qI6+5rqbSGQlBKwyaQPVxCIbST6klAARNwmjQ7gouUhlWAg1OlJQNCH8L42Qru7fGQF2FyBNmlb0Fw/9lq+tWLgXE7FaPfyJZndyDjNS+mIYOprQHXWbdgNy7S1H8r0CL8Up/TlLYPDPf6aUcO5zoWpN/1VOx6ra6amcXR3ykaOi4BXxsW+ti3xJlTCO/4cppZ+nlH7nQtFqVPMUrs8uxmbFd4tdCL1yAIkQYVaY3xkSHVLI0gwQzrp1N/wwpfS+JjKQZvTmJl2xh5HIXt6v17rhj3GF68OLQRp9eg7DhON9dXvyISKbSqUwNxLVOmMbbDJJ/KaUXtXClug5ZZPhR1qJYSHhW/DFbw5kzWio7sMqS87QfyifDF6hq0iXgwJCPE4Cg6MLsFbHEcPjs0ORMz6ScB7V5fIsl1y81bWWYAhJ36E6ivHBXZLB5zbRf0ik7/6qZcaFO7nV89wESJWKVSaDSt9bKaV3Q8K20GeuVr1oZleA+T3wxoWusuKnDvUXXgL0LhJZ8eXo3sKqehYZTva7Wpf5s0Y0WZIUOEkI1yh8oyCEbHo3lG3dd1cgkZxpmv5qDxNCRDMghIgc38g+k9YQb2yCvo3TBKotIQHIqydY7QpkRTJbrRxSxLJ6Tqujy/fTWPFsNDIZleCbSWSt5ePSCKLlW1qHljnU+m/zFTniNcNCYYzyrJQjFGyc9U1np20ukZpQpdbs9V0RTWhWhqNnkUdu3HTgkCESYqmFi8p/5J/4j39SyRQeuQ8Hg9XGG5As0VOlbu3nNwdy9MO2siqtov5aBKRSZqQAJBRdJ9XDivoQwtVIC90lamEXICsJh1w6DYV8HhqJy3VsdYGksKXZcY7u3x0jV4C02NqA7IWiDdCHS7i7AOkeLjdhVjpY+R7xMFGQ9RWS9Qaov1FacHxy1Ii0ybnWEYioAMzXeCHmrGeGxujpGbluVyAdoAUFRXViTjjo0cWJ/r1rAxF3SP8Nbzxyh3p5xqsHNdWAvSmQ0cis+X0tKYgtGmrcMEjZeI1I0NbXPDuQo7qpkfkhM4TTTdhnrNxFh1etjdhJO5JnZAP+/2vPYcFvAWQ3WlAQpaDljAbHXQxKTXI1hkd3yvetJq4uEbqVl4DLY8zdXKbtEUz1HsUL60nwswOpD4nhwNfzCVaxiACgDZme/kfhCz+xVSKwn8UQ8QKE3auO/78oNUzT9Ju1h9cXAYFgk0z5rYCMcS9HTCapNKIRAOKzZQNi+UctgGFcrDSbi/lWGVRJ9rS/Rc/NSNN9Twr9928C5CUfSCW4xmm0egzWnGObSayqGswdkgqjSjvX8nOoCE93efLkqfhMuwPpMj9Zl3odpeWDgk+uYAMmKgCXiPwjz0I8naMWayeJ2fC1WvWocTwUkPqgBb8xGhYFxhf+ZfKUOur8bE4+OGofhuW7ygVqjXUQya5Qswt/dPQ07S6RHYNA+IfjXbB5Q20n99OEl1B0Naj+9F5Bkz9uXkTPuu+qI/WBqjzEta5YK1mozkPiiMGtWUk6Y8OUvh9N0/QH508WoxM7L3Boyt+uQKp+a7UPG7l0MQ/NUZ0BZOHjDc76uV+HPL75eZ5/0ZhTsQDXOdmSBfJFfWs+qrTZcdT5k4cueRLqtcakpytvriNXst/FDCBzg/A3tWZTVA59SOmYas20V6vF+RLC1RqYNwFyZCYuCY3avJ2aTrWRCsrxeSelBM35l63ppQoWakMsfGifg1zA/Mkn9SXeBMjesXAGAUvKNAAGIHGccXtsdKHVXNCRRC1YdEoaJDSsQZ7v4fagQ5uzftTv/Ib6oMPJ290l8gIgM6vWxtdood/H6FbvNoudp+g3RjY8qVth9LPfXCJ7mRX9PuFe0cqhPCIkkawQGXL+X0ByFGib8Owb3S3BsYnktYDdA8g89r9G2Qs0PT/Eo5j8bKXZShdEscjCqYjcTjcqZapPh17AzYEM0Qf6byF9TmfK0gqNo3/q3SYFCH0IHZqcpPXiWHOouD8tVpuCVGSFGpmoauR0qFjbLKjR8TStVh0z48nzLqVmvdo8LEdcBspZXlJrOgBcjZ+jp3BJ+fVQQKq05MSBAmRJ2ua053is9d/ozGYZIbg8pNagP29GGtj7aA9V8jyf0tJqGnMDHlbbZpKby1QAqpVG+hnNJRqaBn2JLt0VyNEPqkcV5hrzIaVdznXOUqqQBRiOhGoTBApWRaV/sTmtavSz2XWHA9K1/eZhSMFAic5TR53P/6EjAQAy/iXukbDXNEtkfYpWB0eXrs4cH21U2hVI39IRohoccuoxwjHXPz49hvQBknwtTE0x/ril1wg5/diui8bTtIY6HcaPdMkIKotidc1f4+8aSV6dcTq8CAH5YwPckVpxzHuccK1WIr2+KFaMa7j0OPvrD3G0ffEqPkxrYIjqSiQUQ4M01njlmbgaj+ro+oFRcA8BZAU8JGUxVaByHW4MDjuAMlxT5gG5sV5IPVLeJZU+tf9mdyBHUmxOHVRb31yJQmo82mKX55ub499SI9GfHZXCXY72SkK32huoD4dTbvMgbciHWea8pVMblpA6+152tjVlhoUmPeeNT64bje5jWAP4ZhK5lvVx7R2LcE4B9fNymUVBIpaJp1Kk0vIshoiXYr02mSgQ3KfNe2xEfVwjxs/1M2FgEoBZd5aEka4lToZr6pElP2mJC7Po+ItkzQsu+3N97kMB6Y+XhnTF2C7nIuGM4yPahCmOPH6nzfqRI7tGwNKShJUduos3Rl7AzSVSAcPv8zu6hJ3r9tJYgtbnI4vB7Aocje7G3MXQsJRtsfLPx9pxpAMlC794YwS02jXPCqS1b6xlWWoNnk76pH7jrLaRo4y2IjVuDQeRTJvMJ+SpxmwhW4YhqsMNG4lTrbprAHex2te+6ZD+WiRi7b6hrycTAXqTpvUlFXXzFvnqEFb7UiBdJ4J3ZeIYbenqSin9MGTP/bo/rxJW9WEtBzD6uZ/1aI9+iNZ1jekBmUVmvqayKsiMU6OWyc/KAvZT/JA6qIOZD1SJlBbDQ0efYVcgg+JfZGesP9uNLiQUZIoKkump0t5y4z9SD/drBTjqAAktGmMkjnsvlTYK4u7uD75ebYKe6+6S5iQX2tkYBouxbRLVf+sR55hLdtyPQXQvAsCRysWOnF4Y2gN1b4lc4+qs8RcBkrBP1uxp+YHsT1GDUcIAVro57rAHkH2/R77aHUhrXu89UKXFzid/rRQbh42s0vhGCfkjsfgRgIwE0eoyxxA+WvOSEU4lqz46OcXRBa3fEWtOe4kMaLpmJtBNgPRLfXqSp7qqKMoHcr40drqKYE502MYmTfIK79za9qypcy2T3ju+h/AjO2m0bGEtqgkOtqXQZB2VRiMAyIB33JksjeoLIrHfrfCHhugnIy87XnMTiVz7YC0Oj1PyfrLKYl6PAgfQqAjKtSQ1cKVohhIKYI37qL/Xq5WCY36pdO4OZA3kFl+nFu65o1vtHazUajJjzbeH+OtqKw96UnpIIPV4N/ut53mWXsWOpOOYY0RsboaVcm2cbDEzowdU7/uHALIxmaU5Vc+OnSPk+y4wACL29jtpqwNCVPKsJ/JJM3mPAiQOdp736PQjVD6JjS077qKUmMAodmh7CVK9+Q0NL/Nwu5BMznygtRHaLd/zJkCucRQVJDtmxcb1QM/LBFVza1yvtuUYczSkYFBuwNe0UoTVcVaJ9+pGQboq9ifqPQtptxd2EyB7+qX1fc9fdMdZ5k2GckOtm1aiGqtLNTom4hA7aX9W2kyzR7L2eW8GZI87PuAiFZNJw9HN61tcHpPMuRXNLJzMWSOTLk+bMSPnFmYM7224JZAXO8OajMCt8d2xfkaQLQqyHm4bwGn7GQxIgEYPY4CE5aYvQnYlNvzMiyb33QzIjsQtWuTi9aHk4KdBS6NTYKZJIcxN88MQWVxuawkubhtZY6gdAsgRHeqa25EyI5zC9TG/kJHZSC/NTh5oyXn6MsJah25PxbQSI4cBUjlAQhqtSKPMkFTJk6GdbuAckpY3LLn1A/nIVqbiY825H+138setB7TJV4SYtUbTQkXp73vtMEA6Nyjzv32zZmU7JzqvmJKiHEjKCcKfDAZJ9ovZ0l6th9v2paKfx9XGZUty4FQuxu8I4CPH6rmuaQxN8lNT8iD2ipQudNw8z5QcfqUrWWQXWBw3ixTGo/0Uj+IQfmRrvLZKZ9EGVxnM/hN/NIP0GSvN5y0BXsZt2/0bO2hFJbS6dVtCtatEdhR7XMCbewqZrqIkfN/suWCfOScelymPZtCQEbCLFFtoivIvsusKHRbIlWgn9yTaEXWGxxi7eVJqYx3VYnCxhrHVAZ6RDBvLxOKLPpf+u+S+l+T/1ErGjLqtZQFI67HxJQgvXXkKlh5xQk5SbDjptpogZ4JG2+oOAaSFZpWVAzXJGeraCovYPJDVTFPUsaOFtEMYm57Uhqz1Yh1qa7OIHkVco7gq2mab1/xDW2RZTAfsfca7ADJIiT9ukv3Rowip1NJoSJuFgmZ9OfZG/5O9YUppicnfPKZWT0jrNFS3xR/maI++eReJ1KRK2o3DeMU8dMSNd1gsWlPw/Abl1sjFKqPt0ECujJhZRBwKRJGXdHPKIRBYXA6RHykWCWemuZKr3k4p/SZEMbWqZeYredVzGCBrWfQKTcVXAH2ng+m+2A1rX8dSA0AezmkujS7VwF2SPvFLToZfcnQYIFuWe+TBfPuwX+DrIyS4k35FtGsMNf3a3M5Zc7ni5zoUkCOgVWJujjkNn8L59rRlP9VPQfXHEuNia1NtDkZzrm6v7fiugKw5x254ks/gFGMcnFWXWrdj9TJESaYPmKXWPRD5a8FzaIaKhwCylgW6RjrDQ1sZwRqb8p4xi6TUhSo2GusUAnRq4YeqTsX1qa64OgqQq/u+1sI0tcxYYEn2OmZFwQe3hG+jPpMJBLFlr+NuZb16CCB70tcCUiVrdtvdbeOSLzUgmdJkHxeuOZBstpo5+hzhqgVv1W3uBUjTbWS9CzcmHGerKhowFL0Y3UBEw9/0LfI3oSOgEQUVjU0qubhWBVmh97LvBciiPc5JkqgEDfkID4k6fOKWqMYsOUfdhhwDLD+bR0G0gNKjXu0i8z9zL0B2N7CHcu1qL6P3WV3TPOFljqNXiLEi5bFId2gga2MMvTSGmDqPhFVdCPUEnTk0lsZcJO8KaceEkLP4um3/rFnuowO5xpGsSqkbEI9elWVBQY8COFa+e6wdqM0ZGybRhwayp+AtH6kGIpNKLTT0BTOt0wAILSQy1SoccbLkSLFw1EcccU//u2sgg8QIYVTBWaS6lF+J820jHISJVhniibRi1fOYxXme/0s7yyRzFF+wRFe9t36E78eYecXC5u2eqt+a/B61xguGm9W41S2yKQPN+rq+uGMxLVYAkqVBNvestYNGjVNejlap/nG0ZduSAoC+zEvWoi6trDYwHlHedWtG6i4kMlrqeZ5JwjKhj0J+7s2uHLkikaFlhkxn8Qw2A9Yv9W3dr+YaHQbIkZxfTWLjBvlgQGyWWk6zBamzSIiMEFgAfB7HPaLWzEs4DJAjH3r0GjdHEkZGzuL4+rk/9kpoxcBErlBeIDTPc6bI1Aj5dwOkGgckJvqFPkERexgJC3HK/c4bM0iEnUVaTE+FDR6hnmOVyKLlOaoEuW70Le99XSu9FY5qbchH7raN+tT367jJ0dzSj5j969qz586LvQHa8vfX+qrjKFmtICJ1jKpBHxo5KxfObDe36tvV/WC2Z+duJLJhaHLWe8V1kqVrlWjFil5SFLO2PM3WW4rNj1C0RAj38wPu5D73DmR1kFw47l6H4keS5CXX6PONhIfvu3q3sHv1BVi0BKhC0nJ94XxNSg93DWRHCpvLI9VxF9fIEfsttwnw71sbsi0Y8oM6rTXaNs/fDZAqAVXOjXPWkSArNbQyQ56VViOmSoyuCQ6+jwRjvWXqfnSP3O++j1i7Z5Dcgt4FCV+Pos0FkuZ49zVbaI7RwXUCLAbVMTbRL6rEOAHo567/EQkmV4lr9elDHe2QJV9sbFJHPWe34xSBoFsBCaOyWENg5WO9npf3xaMBiZTY4ouijWNktAKL3VQ9/HqtyyuQsySsfAggaTaapqnpOGszEkdVIhy1zkWNxsfo+v+e4re41ulHiZQeAsgLdCjxNA52dTJVT2q9ox6d9ZcCJMYGIgFZoKIP27JHGhW9qdlxyFWWKffsjdiygr/JcqIPHxbI3rguF2e32udk9bTG3bwAG4Pje3sAG6P23l0DGUuoNZ9yxWkn+yPrW/SY4jNSdcT1iXxyLLiR9JFCwEQSrU3vvt2fHmdRIxisuJUWAEh2dTs6oPF9/HhFzwVCEj9z+8MAFSAJELJ03pVE1jaA9AxNI9mR5wZZH7c2gsILAhPZEaYRDq13Qpl2KwU58tRvcJMkO3RvQK5OtddoZEEKcEdeWpPVBYojEjnqrX7xTIHRYlmeEG1JjLsCsid9LplQtNh53el8yKKNRAHxY2/wOwkL+VvSapa/1A4Jqo8kPh43+xPTaFbUahzz3EDvs/C2r1s7aCEV4JQTLhpXHV1JWg3SwWNENmuS2iIXqL7DWLzq9j7YuisMTG5BdtfmKVYqwVwn2+0e6mivuDp501K8Rh1x4nJb0SI9OSmld9xIBqFG62ClQj/a/V4KkLV2u7xHR7NCBSnf+ZbQVaBNy1osdZ1itfL1hweyMSkF/YYzbftlfcdDDgONH6TGBknFKednpSzhjNgbdw+k6a8VPpBfN2AZ8DhyRhYMubm9efq+uTfG5g05TyO3fvwIQA6PCrMpLC4stAhGiKQpJUYjvqu6sLq4V4EFaKQ47/u+eyB7vmXPoitfUphu6ifm0dyVxnmbwYYPWZR4XzSQTsfZ7jDb8kkCeLEZWY0SutUWXGaj89BAtmoya8slXXqt6Ak3agqjctyyIkm1PXyGvEb5q/iRHFeTLD9esdoIEGYJ8XPE7m89tESO6E/jZdoMtDBFtfAX1dD45ntpZLobDvkIIFtco1FOXrXq6+Wag/TrpT3Z4P79yFEAe0lgF8n4cNFi71x5VGo0rtInRSZp9IPc+3W+LKHlWZISi66wGom0E8OTPXoZSYtGosKWCjV33lQSGjK+wW2Yp/hFPvKVF29sVqRNenTCoCYZguzqN/y4+J4PBaTG3fh1i/GynQjHLzSXGoz6oH5onU2S9nXuPDnwoYBUg7HWCJofPGTRu/Mh/RTUChf9+w8HZEUfxrSYzCZ34WFrdFf2IeMg5TjtdPcZu7fwBNbcnrW5lWFSoBH2MUx+mxPGh6+9TKvdKIIVu8TC0c87HRqTCk6r3dKVYeudNJW6FTB5Lrrq5e88vI68VH3UVIEyLnDgZcpfbRPJiwXST3j2hkf/X0j97ut5vZUmghdk/5cOZNHE6YCrUmNcl5jNOZdt8/zciwVy9Mjbljsfl9usS1txwNH/f58RJPZm1Ts3AAAAAElFTkSuQmCC'
            />
            <Image
                id='image1_653_17815'
                width={190}
                height={138}
                xlinkHref='data:image/png;base64,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'
            />
            <Image
                id='image2_653_17815'
                width={110}
                height={64}
                xlinkHref='data:image/png;base64,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'
            />
        </Defs>
    </Svg>
);

export default TownSquareIllustration;
