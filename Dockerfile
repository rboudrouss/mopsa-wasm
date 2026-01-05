FROM ubuntu:24.04

# Prevent interactive prompts
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies including GCC 11, LLVM 19, and development libraries
RUN apt-get update && apt-get install -y \
    build-essential \
    gcc-11 \
    g++-11 \
    curl \
    wget \
    git \
    lsb-release \
    software-properties-common \
    gnupg \
    m4 \
    unzip \
    patch \
    sudo \
    ca-certificates \
    pkg-config \
    libgmp-dev \
    libmpfr-dev \
    rsync \
    clang \
    llvm \
    llvm-dev \
    libclang-dev \
    libclang-cpp-dev \
    && rm -rf /var/lib/apt/lists/*

# Set GCC 11 as default
RUN update-alternatives --install /usr/bin/gcc gcc /usr/bin/gcc-11 100 && \
    update-alternatives --install /usr/bin/g++ g++ /usr/bin/g++-11 100

# Set LLVM 19 as default
ENV PATH=/usr/lib/llvm-19/bin:$PATH
ENV CC=clang
ENV CXX=clang++
ENV LLVM_CONFIG=llvm-config

# Install Node.js 20.x 
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Install pnpm globally
RUN npm install -g pnpm@9.0.0

# Install Emscripten SDK
RUN git clone https://github.com/emscripten-core/emsdk.git /opt/emsdk && \
    cd /opt/emsdk && \
    ./emsdk install latest && \
    ./emsdk activate latest

# Set Emscripten environment variables
ENV EMSDK=/opt/emsdk
ENV EM_CONFIG=/opt/emsdk/.emscripten
ENV PATH=/opt/emsdk:/opt/emsdk/upstream/emscripten:$PATH

# Install opam
RUN wget https://github.com/ocaml/opam/releases/download/2.1.5/opam-2.1.5-x86_64-linux -O /usr/local/bin/opam && \
    chmod +x /usr/local/bin/opam

# Create a non-root user for development with matching UID/GID
ARG USER_UID=1000
ARG USER_GID=1000
RUN groupadd -g ${USER_GID} ubuntu || true && \
    useradd -m -u ${USER_UID} -g ${USER_GID} -s /bin/bash ubuntu || true && \
    echo "ubuntu ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

USER ubuntu
WORKDIR /home/ubuntu

# Configure emsdk in shell startup scripts
RUN echo 'source "/opt/emsdk/emsdk_env.sh"' >> $HOME/.bashrc && \
    echo 'source "/opt/emsdk/emsdk_env.sh"' >> $HOME/.bash_profile

# Initialize opam with OCaml 4.12.0 directly
ENV OPAMYES=1
RUN opam init --disable-sandboxing -y -c 4.12.0 && \
    eval $(opam env)

# Set environment for opam
ENV OPAMROOT=/home/ubuntu/.opam
ENV PATH=/home/ubuntu/.opam/4.12.0/bin:$PATH

# Copy mopsa-analyzer to install dependencies
COPY --chown=ubuntu:ubuntu mopsa-analyzer /home/ubuntu/mopsa-analyzer

# Remove submodule git reference and initialize fresh git repo
RUN cd /home/ubuntu/mopsa-analyzer && \
    rm -rf .git && \
    git init && \
    git add . && \
    git config user.email "docker@build" && \
    git config user.name "Docker Build" && \
    git commit -m "Initial commit for Docker build"

# Install mopsa dependencies and pin mopsa locally
RUN eval $(opam env) && \
    cd /home/ubuntu/mopsa-analyzer && \
    opam install --deps-only --with-test --with-doc --assume-depexts . -y

RUN eval $(opam env) && \
    cd /home/ubuntu/mopsa-analyzer && \
    LANG=C opam pin add mopsa . --with-doc --with-test --assume-depexts -y

# Set working directory
WORKDIR /workspace

# Keep the container interactive
CMD ["/bin/bash"]
