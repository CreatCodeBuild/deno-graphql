csp-init:
	cd csp && yarn add --dev typescript mocha @types/node @types/mocha

csp-test:
	cd csp && $$(yarn bin)/mocha -r ts-node/register csp_test.ts

csp-build: csp-test csp-compile
	
csp-compile:
	cd csp && rm -rf dist && $$(yarn bin)/tsc
