# syntax=docker/dockerfile:1.6
# Cursor Cloud Agent Dockerfile for mattermost-mobile.
# Pattern: Ubuntu 24.04 + JDK 17 + Android SDK + Node + agent-browser (computer use).
# The image is intentionally Android-only: iOS builds require macOS and are not supported in cloud agents.

FROM ubuntu:24.04
SHELL ["/bin/bash", "-o", "pipefail", "-c"]

ARG DEBIAN_FRONTEND=noninteractive

# Pin every tool so rebuilds are reproducible.
ARG NODE_VERSION=24.15.0
ARG NVM_VERSION=0.40.3
ARG AGENT_BROWSER_VERSION=0.27.0
ARG DOCKER_VERSION=5:28.5.2-1~ubuntu.24.04~noble
ARG DOCKER_CLI_VERSION=5:28.5.2-1~ubuntu.24.04~noble
ARG ANDROID_CMDLINE_TOOLS_VERSION=11076708
ARG ANDROID_PLATFORM_VERSION=34
ARG ANDROID_BUILD_TOOLS_VERSION=34.0.0
ARG ANDROID_NDK_VERSION=27.1.12297006

ENV NVM_DIR=/home/ubuntu/.nvm
ENV ANDROID_HOME=/opt/android-sdk
ENV ANDROID_SDK_ROOT=/opt/android-sdk
ENV ANDROID_AVD_HOME=/home/ubuntu/.android/avd
ENV JAVA_HOME=/opt/java
ENV PATH=/home/ubuntu/.nvm/versions/node/v${NODE_VERSION}/bin:/opt/java/bin:/opt/android-sdk/cmdline-tools/latest/bin:/opt/android-sdk/platform-tools:/opt/android-sdk/emulator:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

# Base toolchain + computer-use runtime libs (Chromium / GTK) + emulator runtime libs (KVM, audio, OpenGL).
RUN apt-get update && apt-get install -y --no-install-recommends \
    bash build-essential ca-certificates curl dnsutils file git git-lfs gnupg jq locales \
    make nano openssh-server pkg-config procps python3 python3-pip python3-venv rsync sudo \
    tar tmux unzip vim xz-utils zip \
    acl fuse-overlayfs iproute2 iptables lsof netcat-openbsd \
    libasound2t64 libatk-bridge2.0-0 libatk1.0-0 libatspi2.0-0 libcairo2 libcups2 libdrm2 \
    libgbm1 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 libsecret-1-0 libx11-xcb1 \
    libxcomposite1 libxdamage1 libxfixes3 libxkbcommon0 libxrandr2 libxshmfence1 \
    libpulse0 libvirglrenderer1 libgl1 libegl1 libxcb-cursor0 libxcb-shape0 \
    libxkbfile1 libxcursor1 libnsl2 libtinfo6 libfontconfig1 \
    qemu-utils \
    && locale-gen en_US.UTF-8 \
    && git lfs install --system \
    && rm -rf /var/lib/apt/lists/*

ENV LANG=en_US.UTF-8
ENV LC_ALL=en_US.UTF-8

# Temurin JDK 17 (React Native 0.83 requires JDK 17).
RUN install -m 0755 -d /etc/apt/keyrings && \
    curl --retry 3 --retry-delay 5 -fsSL https://packages.adoptium.net/artifactory/api/gpg/key/public | \
      gpg --dearmor -o /etc/apt/keyrings/adoptium.gpg && \
    chmod a+r /etc/apt/keyrings/adoptium.gpg && \
    echo "deb [signed-by=/etc/apt/keyrings/adoptium.gpg] https://packages.adoptium.net/artifactory/deb $(. /etc/os-release && echo $VERSION_CODENAME) main" \
      > /etc/apt/sources.list.d/adoptium.list && \
    apt-get update && \
    apt-get install -y --no-install-recommends temurin-17-jdk && \
    rm -rf /var/lib/apt/lists/* && \
    ln -sfn "$(dirname "$(dirname "$(readlink -f "$(command -v javac)")")")" /opt/java

# Docker CE (DinD). Kept light: dockerd is not started by default at boot — see start script.
RUN install -m 0755 -d /etc/apt/keyrings && \
    curl --retry 3 --retry-delay 5 -fsSL https://download.docker.com/linux/ubuntu/gpg | \
      gpg --dearmor -o /etc/apt/keyrings/docker.gpg && \
    chmod a+r /etc/apt/keyrings/docker.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      tee /etc/apt/sources.list.d/docker.list > /dev/null && \
    apt-get update && \
    apt-get install -y --no-install-recommends \
      docker-ce=${DOCKER_VERSION} \
      docker-ce-cli=${DOCKER_CLI_VERSION} \
      containerd.io \
      docker-buildx-plugin \
      docker-compose-plugin \
    && rm -rf /var/lib/apt/lists/*

# DinD configuration: fuse-overlayfs storage driver + BuildKit + iptables-legacy.
RUN mkdir -p /etc/docker && \
    printf '%s\n' \
      '{' \
      '  "storage-driver": "fuse-overlayfs",' \
      '  "features": {' \
      '    "buildkit": true' \
      '  }' \
      '}' > /etc/docker/daemon.json && \
    update-alternatives --set iptables /usr/sbin/iptables-legacy && \
    update-alternatives --set ip6tables /usr/sbin/ip6tables-legacy

# GitHub CLI.
RUN install -m 0755 -d /etc/apt/keyrings && \
    curl --retry 3 --retry-delay 5 -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | \
      gpg --dearmor -o /etc/apt/keyrings/githubcli-archive-keyring.gpg && \
    chmod a+r /etc/apt/keyrings/githubcli-archive-keyring.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
      > /etc/apt/sources.list.d/github-cli.list && \
    apt-get update && \
    apt-get install -y --no-install-recommends gh && \
    rm -rf /var/lib/apt/lists/*

# Create the ubuntu user with passwordless sudo, docker group, and KVM group access.
RUN install -m 0755 -d /var/run/sshd && \
    printf '%s\n' 'PasswordAuthentication no' 'ChallengeResponseAuthentication no' 'UsePAM no' \
      > /etc/ssh/sshd_config.d/disable_password_auth.conf && \
    if ! id -u ubuntu >/dev/null 2>&1; then useradd -m -s /bin/bash ubuntu; fi && \
    groupadd -f docker && \
    groupadd -f kvm && \
    usermod -aG docker,sudo,kvm ubuntu && \
    echo "ubuntu ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/ubuntu && \
    chmod 0440 /etc/sudoers.d/ubuntu && \
    passwd -l ubuntu && \
    install -d -o ubuntu -g ubuntu "${NVM_DIR}" "${ANDROID_AVD_HOME}"

# Android SDK: cmdline-tools, platform-tools, build-tools, platform, NDK, emulator, system-image.
# System-image architecture matches the host (x86_64 on amd64, arm64-v8a on arm64).
RUN ARCH="$(dpkg --print-architecture)" && \
    case "$ARCH" in \
      amd64) ANDROID_SYSIMG_ABI=x86_64 ;; \
      arm64) ANDROID_SYSIMG_ABI=arm64-v8a ;; \
      *) echo "Unsupported arch: $ARCH" >&2; exit 1 ;; \
    esac && \
    mkdir -p "${ANDROID_HOME}/cmdline-tools" && \
    curl -fsSL "https://dl.google.com/android/repository/commandlinetools-linux-${ANDROID_CMDLINE_TOOLS_VERSION}_latest.zip" \
      -o /tmp/cmdline-tools.zip && \
    unzip -q /tmp/cmdline-tools.zip -d "${ANDROID_HOME}/cmdline-tools" && \
    mv "${ANDROID_HOME}/cmdline-tools/cmdline-tools" "${ANDROID_HOME}/cmdline-tools/latest" && \
    rm /tmp/cmdline-tools.zip && \
    ( yes || true ) | "${ANDROID_HOME}/cmdline-tools/latest/bin/sdkmanager" --licenses >/dev/null && \
    "${ANDROID_HOME}/cmdline-tools/latest/bin/sdkmanager" --install \
      "platform-tools" \
      "platforms;android-${ANDROID_PLATFORM_VERSION}" \
      "build-tools;${ANDROID_BUILD_TOOLS_VERSION}" \
      "ndk;${ANDROID_NDK_VERSION}" && \
    if [ "$ARCH" = "amd64" ]; then \
      "${ANDROID_HOME}/cmdline-tools/latest/bin/sdkmanager" --install \
        "emulator" \
        "system-images;android-${ANDROID_PLATFORM_VERSION};google_apis;${ANDROID_SYSIMG_ABI}"; \
    else \
      echo "WARN: Android emulator + system-image are amd64-only via sdkmanager; skipping on $ARCH (image is for amd64 Cursor cloud)" >&2; \
    fi && \
    chown -R ubuntu:ubuntu "${ANDROID_HOME}"

ENV ANDROID_NDK_HOME=/opt/android-sdk/ndk/${ANDROID_NDK_VERSION}
ENV ANDROID_NDK_ROOT=/opt/android-sdk/ndk/${ANDROID_NDK_VERSION}

# nvm + Node + agent-browser (computer use).
RUN git clone --depth 1 --branch "v${NVM_VERSION}" https://github.com/nvm-sh/nvm.git "${NVM_DIR}" && \
    chown -R ubuntu:ubuntu "${NVM_DIR}" && \
    su ubuntu -c "bash -lc 'set -e; \
      source ${NVM_DIR}/nvm.sh; \
      nvm install ${NODE_VERSION}; \
      nvm alias default ${NODE_VERSION}; \
      nvm use default; \
      npm install -g agent-browser@${AGENT_BROWSER_VERSION}; \
      agent-browser install || true'" && \
    ln -sfn "${NVM_DIR}/versions/node/v${NODE_VERSION}/bin/node" /usr/local/bin/node && \
    ln -sfn "${NVM_DIR}/versions/node/v${NODE_VERSION}/bin/npm" /usr/local/bin/npm && \
    ln -sfn "${NVM_DIR}/versions/node/v${NODE_VERSION}/bin/npx" /usr/local/bin/npx && \
    ln -sfn "${NVM_DIR}/versions/node/v${NODE_VERSION}/bin/agent-browser" /usr/local/bin/agent-browser

# Login-shell PATH for interactive sessions and tmux terminals.
RUN { \
      echo 'export NVM_DIR="$HOME/.nvm"'; \
      echo '[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"'; \
      echo 'export JAVA_HOME=/opt/java'; \
      echo 'export ANDROID_HOME=/opt/android-sdk'; \
      echo 'export ANDROID_SDK_ROOT=/opt/android-sdk'; \
      echo 'export ANDROID_AVD_HOME="$HOME/.android/avd"'; \
      echo "export PATH=\"\$NVM_DIR/versions/node/v${NODE_VERSION}/bin:\$JAVA_HOME/bin:\$ANDROID_HOME/cmdline-tools/latest/bin:\$ANDROID_HOME/platform-tools:\$ANDROID_HOME/emulator:\$PATH\""; \
    } >> /home/ubuntu/.bashrc && \
    chown ubuntu:ubuntu /home/ubuntu/.bashrc

WORKDIR /home/ubuntu
USER ubuntu
