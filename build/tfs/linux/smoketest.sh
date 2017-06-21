#!/bin/bash
set -e

. ./scripts/env.sh
. ./build/tfs/common/common.sh

export ARCH="$1"
export VSCODE_MIXIN_PASSWORD="$2"
VSO_PAT="$3"

echo "machine monacotools.visualstudio.com password $VSO_PAT" > ~/.netrc

step "Install dependencies" \
	npm install --arch=$ARCH --unsafe-perm

step "Mix in repository from vscode-distro" \
	npm run gulp -- mixin

step "Get Electron" \
	npm run gulp -- "electron-$ARCH"

step "Install distro dependencies" \
	node build/tfs/common/installDistro.js --arch=$ARCH

step "Build minified" \
	npm run gulp -- --max_old_space_size=4096 "vscode-linux-$ARCH-min"

function configureEnvironment {
	id -u testuser &>/dev/null || (useradd -m testuser; chpasswd <<< testuser:testpassword)
	git config --global user.name "VS Code Agent"
	git config --global user.email "monacotools@microsoft.com"
	chown -R testuser $AGENT_BUILDDIRECTORY
	chown -R testuser /root # to allow 'npm install' to succeed in Express repository
}

function runTest {
	pushd test/smoke
	npm install
	npm run compile
	sudo -u testuser xvfb-run -a -s "-screen 0 1024x768x8" node src/main.js --latest "$AGENT_BUILDDIRECTORY/VSCode-linux-ia32/code-insiders"
	popd
}

step "Configure environment" configureEnvironment

step "Run smoke test" runTest

