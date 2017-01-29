#!/bin/sh

rm -fr "~/.cache"

TYPESCRIPT_CACHE_DIR="~/.cache" meteor test-packages --driver-package=practicalmeteor:mocha ./
