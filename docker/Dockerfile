FROM node:8-slim

ENV ANDROID_SDK_TOOLS_VERSION   4333796
ENV ANDROID_HOME                /opt/android
ENV WATCHMAN_VERSION            4.9.0
ENV PATH                        $ANDROID_HOME/platform-tools:$ANDROID_HOME/tools:$PATH

RUN apt-get update && apt-get install -y \
    wget \
    unzip \
    git \
    procps \
    # required by make build-android
    bundler \
    # required by fastlane
    zlib1g-dev

# Android SDK
# https://bugs.debian.org/cgi-bin/bugreport.cgi?bug=863199
RUN mkdir -p /usr/share/man/man1 && apt-get install -y default-jre default-jdk
RUN mkdir -p ${ANDROID_HOME} && cd ${ANDROID_HOME} && \
    wget -q https://dl.google.com/android/repository/sdk-tools-linux-${ANDROID_SDK_TOOLS_VERSION}.zip && \
    unzip sdk-tools-linux-${ANDROID_SDK_TOOLS_VERSION}.zip && \
    rm -rf sdk-tools-linux-${ANDROID_SDK_TOOLS_VERSION}.zip
RUN cd ${ANDROID_HOME}/tools && yes | ./bin/sdkmanager \
    "build-tools;23.0.3" \
    "build-tools;25.0.3" \
    "build-tools;26.0.1" \
    "emulator" \
    "platform-tools" \
    "extras;google;google_play_services"

# Watchman
RUN apt-get install -y \
    libssl-dev \
    autoconf \
    automake \
    libtool \
    python-setuptools \
    python-dev \
    pkg-config \
    g++ \
    make
RUN git clone https://github.com/facebook/watchman.git
RUN cd watchman && \
    git checkout v${WATCHMAN_VERSION} && \
    ./autogen.sh && \
    ./configure && \
    make -j $(nproc) && \
    make install && \
    cd .. && rm -rf watchman

# react-native-cli
RUN npm -g install react-native-cli

# fastlane requires the en_us.UTF-8 locale
RUN apt-get install -y locales-all locales
RUN locale-gen en_US.UTF-8 && dpkg-reconfigure locales
ENV LC_ALL en_US.UTF-8
ENV LANG en_US.UTF-8
ENV LANGUAGE en_US.UTF-8
