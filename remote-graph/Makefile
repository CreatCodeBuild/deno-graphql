publish:
	tsc
	cp package.json dist/package.json
	cp readme.md dist/readme.md
	npm publish dist

unit-test:
	$$(npm bin)/mocha -r ts-node/register RemoteType.test.ts

integration-test:
	cd integration-tests && \
	$$(npm bin)/mocha -r ts-node/register integration.test.ts --timeout 10000

test: unit-test integration-test
