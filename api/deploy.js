// deploy.js
import { E } from '@endo/eventual-send';

export const deployContract = async homeP => {
  const { zoe, board } = E.get(homeP);

  // Bundle and install the contract
  const bundleId = await E(homeP).bundleSource('./contracts/contract.js');
  const installation = await E(zoe).install(bundleId);

  console.log(`Contract installed with installation ID:`, installation);

  // Set up terms
  const subscriptionPrice = { brand: "hello1", value: 100n }; // Update YOUR_BRAND_HERE
  const subscriptionDuration = 30n; // e.g., 30 days
  const terms = harden({ subscriptionPrice, subscriptionDuration });

  // Start the contract
  const { creatorFacet, publicFacet } = await E(zoe).startInstance(installation, {}, terms);

  // Share the public facet via Agoric board
  const publicFacetId = await E(board).getId(publicFacet);
  console.log(`Public facet shared at board ID:`, publicFacetId);

  return { creatorFacet, publicFacet };
};
