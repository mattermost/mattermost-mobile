# syntax=docker/dockerfile:1.6
# Cursor Cloud Agent image for PR babysitting (lint, tsc, Jest, gh).
# Intentionally no Docker-in-Docker, Android SDK, Xcode, or simulators.

FROM ubuntu:24.04
SHELL ["/bin/bash", "-o", "pipefail", "-c"]

ARG DEBIAN_FRONTEND=noninteractive
ARG NODE_VERSION=24.15.0
ARG NVM_VERSION=0.40.3

ENV NVM_DIR=/home/ubuntu/.nvm
ENV PATH=/home/ubuntu/.nvm/versions/node/v${NODE_VERSION}/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

RUN apt-get update && apt-get install -y --no-install-recommends \
    bash ca-certificates curl git git-lfs gnupg jq locales \
    openssh-server python3 rsync sudo tar tmux unzip vim xz-utils zip \
    && locale-gen en_US.UTF-8 \
    && git lfs install --system \
    && rm -rf /var/lib/apt/lists/*

ENV LANG=en_US.UTF-8
ENV LC_ALL=en_US.UTF-8

# GitHub CLI — babysitter loop uses `gh pr checks` / `gh run view`.
RUN install -m 0755 -d /etc/apt/keyrings && \
    curl --retry 3 --retry-delay 5 -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | \
      gpg --dearmor -o /etc/apt/keyrings/githubcli-archive-keyring.gpg && \
    chmod a+r /etc/apt/keyrings/githubcli-archive-keyring.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
      > /etc/apt/sources.list.d/github-cli.list && \
    apt-get update && \
    apt-get install -y --no-install-recommends gh && \
    rm -rf /var/lib/apt/lists/*

RUN install -m 0755 -d /var/run/sshd && \
    printf '%s\n' 'PasswordAuthentication no' 'ChallengeResponseAuthentication no' 'UsePAM no' \
      > /etc/ssh/sshd_config.d/disable_password_auth.conf && \
    if ! id -u ubuntu >/dev/null 2>&1; then useradd -m -s /bin/bash ubuntu; fi && \
    usermod -aG sudo ubuntu && \
    echo "ubuntu ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/ubuntu && \
    chmod 0440 /etc/sudoers.d/ubuntu && \
    passwd -l ubuntu && \
    install -d -o ubuntu -g ubuntu "${NVM_DIR}"

RUN git clone --depth 1 --branch "v${NVM_VERSION}" https://github.com/nvm-sh/nvm.git "${NVM_DIR}" && \
    chown -R ubuntu:ubuntu "${NVM_DIR}" && \
    su ubuntu -c "bash -lc 'set -e; \
      source ${NVM_DIR}/nvm.sh; \
      nvm install ${NODE_VERSION}; \
      nvm alias default ${NODE_VERSION}; \
      nvm use default'" && \
    ln -sfn "${NVM_DIR}/versions/node/v${NODE_VERSION}/bin/node" /usr/local/bin/node && \
    ln -sfn "${NVM_DIR}/versions/node/v${NODE_VERSION}/bin/npm" /usr/local/bin/npm && \
    ln -sfn "${NVM_DIR}/versions/node/v${NODE_VERSION}/bin/npx" /usr/local/bin/npx

RUN { \
      echo 'export NVM_DIR="$HOME/.nvm"'; \
      echo '[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"'; \
      echo "export PATH=\"\$NVM_DIR/versions/node/v${NODE_VERSION}/bin:\$PATH\""; \
    } >> /home/ubuntu/.bashrc && \
    chown ubuntu:ubuntu /home/ubuntu/.bashrc

WORKDIR /home/ubuntu
USER ubuntu
