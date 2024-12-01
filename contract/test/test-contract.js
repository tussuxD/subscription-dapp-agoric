import { E } from '@endo/eventual-send';
import { makeZoe } from '@agoric/zoe';
import { assert } from '@agoric/assert';

test('should deploy and execute contract logic', async t => {
  const zoe = makeZoe(/* kernel config */);
  const bundle = await E(zoe).installBundle(/* path to bundle */);

  // Interact with the contract
  const instance = await E(zoe).startInstance(bundle);
  const result = await E(instance.publicFacet).method();

  assert(result, 'Expected outcome');
});
