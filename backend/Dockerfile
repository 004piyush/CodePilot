FROM ubuntu:24.04

# Avoid interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install Java 21, Python 3, and core utilities
RUN apt-get update && apt-get install -y --no-install-recommends \
    openjdk-21-jdk \
    python3 \
    python3-pip \
    nodejs \
    bash \
    coreutils \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /workspace

# Create an unprivileged user for secure execution
RUN useradd -m -u 1001 sandboxuser && \
    chown -R sandboxuser:sandboxuser /workspace

USER sandboxuser

# Keep container alive so we can execute commands inside it dynamically
CMD ["tail", "-f", "/dev/null"]