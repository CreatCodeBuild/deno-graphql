test:
	$$(yarn bin)/mocha -r ts-node/register src/*test.ts

test-csp:
	$$(yarn bin)/mocha -r ts-node/register src/csp_test.ts

build-channel:
	$$(yarn bin)/tsc src/channel.ts