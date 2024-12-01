import { Far } from '@endo/far';
import { AmountMath, AmountShape } from '@agoric/ertp';
import { M } from '@endo/patterns';

const { Fail, quote: q } = assert;

/**
 * Subscription terms include price and duration for subscriptions.
 *
 * @typedef {{
 *   subscriptionPrice: import('@agoric/ertp').Amount<'nat'>,
 *   subscriptionDuration: bigint
 * }} SubscriptionTerms
 */

/**
 * Start the subscription contract.
 *
 * @param {ZCF<SubscriptionTerms>} zcf
 */

export const start = async zcf => {
  const { subscriptionPrice, subscriptionDuration } = zcf.getTerms();

  // Validate subscription terms
  subscriptionPrice || Fail`subscriptionPrice is required`;
  subscriptionDuration > 0n || Fail`subscriptionDuration must be greater than 0`;

  // Create a mint for subscription tokens
  const subscriptionMint = await zcf.makeZCFMint('SubscriptionToken', 'nat');
  const { brand: subscriptionBrand } = subscriptionMint.getIssuerRecord();

  // Track active subscriptions
  const subscribers = new Map();

  /**
   * Check if the subscription is active for a user.
   *
   * @param {string} user
   * @returns {boolean}
   */
  const isActive = user => {
    const subscription = subscribers.get(user);
    return !!subscription && subscription.expiry > Date.now();
  };

  const proposalShape = harden({
    give: { Price: AmountShape },
    want: { SubscriptionToken: { brand: subscriptionBrand, value: M.nat() } },
    exit: M.any(),
  });

  /**
   * Handle a subscription offer.
   *
   * @param {ZCFSeat} seat
   * @param {object} offerArgs
   * @param {string} offerArgs.user - User's name for the subscription
   * @returns {string}
   */
  const subscriptionHandler = (seat, offerArgs) => {
    const { give } = seat.getProposal();

    // Check payment against subscription price
    AmountMath.isEqual(give.Price, subscriptionPrice) ||
      Fail`Price does not match the required subscription price`;

    // Extract user from offerArgs
    const user = offerArgs?.user || 'anonymous';
    const expiry = Date.now() + Number(subscriptionDuration) * 1000;
    subscribers.set(user, { expiry });

    // Mint a subscription token
    const tokens = AmountMath.make(subscriptionBrand, 1n);
    subscriptionMint.mintGains(harden({ SubscriptionToken: tokens }), seat);

    seat.exit();
    return `Subscription active for ${user} until ${new Date(expiry).toISOString()}`;
  };

  /**
   * Create an invitation for subscription.
   *
   * Proposal keywords:
   * - give: `Price`
   */
  const makeSubscriptionInvitation = () =>
    zcf.makeInvitation(
      subscriptionHandler,
      'Subscribe',
      undefined,
      harden(proposalShape),
    );

  // Public Facet
  const publicFacet = Far('Subscription Public Facet', {
    makeSubscriptionInvitation,
    isActive,
  });

  return harden({ publicFacet });
};

harden(start);
