#!/bin/bash

mkdir node_modules
npm pack $1 | xargs tar xvzf
mv package node_modules/$1
rm *.tgz

