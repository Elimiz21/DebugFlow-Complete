# Use the official Node.js image as base
FROM node:20-bullseye

# Install basic development tools
RUN apt-get update && apt-get install -y \
    git \
    curl \
    wget \
    vim \
    sudo \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Install GitHub CLI
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
    && chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
    && apt-get update \
    && apt-get install gh -y \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user
ARG USERNAME=node
ARG USER_UID=1000
ARG USER_GID=$USER_UID

# Ensure the node user has sudo access
RUN echo $USERNAME ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME

# Set the working directory
WORKDIR /workspace

# Switch to the node user
USER $USERNAME

# Set environment variables
ENV NODE_ENV=development

# Keep the container running
CMD ["sleep", "infinity"]