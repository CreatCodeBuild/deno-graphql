init:
	yarn add --dev typescript mocha @types/node @types/mocha

test:
	$$(yarn bin)/mocha -r ts-node/register src/csp_test.ts

build: test compile
	
compile:
	rm -rf dist
	# $$(yarn bin)/tsc
	$$(yarn bin)/tsc --module es6 --outDir dist/es
