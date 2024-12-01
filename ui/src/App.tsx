import { useEffect } from 'react';

import './App.css';
import {
  makeAgoricChainStorageWatcher,
  AgoricChainStoragePathKind as Kind,
} from '@agoric/rpc';
import { create } from 'zustand';
import {
  makeAgoricWalletConnection,
  suggestChain,
} from '@agoric/web-components';
import { subscribeLatest } from '@agoric/notifier';
import { Logos } from './components/Logos';
import { Inventory } from './components/Inventory';

const ENDPOINTS = {
  RPC: 'http://localhost:26657',
  API: 'http://localhost:1317',
};

const watcher = makeAgoricChainStorageWatcher(ENDPOINTS.API, 'agoriclocal');

interface AppState {
  wallet?: Wallet;
  purses?: Array<Purse>;
  subscriptionInstance?: unknown;
}

const useAppStore = create<AppState>(() => ({}));

const setup = async () => {
  watcher.watchLatest<Array<[string, unknown]>>(
    [Kind.Data, 'published.agoricNames.instance'],
    instances => {
      console.log('Got instances:', instances);
      useAppStore.setState({
        subscriptionInstance: instances.find(([name]) => name === 'Subscription')?.[1],
      });
    },
  );
};

const connectWallet = async () => {
  await suggestChain('https://local.agoric.net/network-config');
  const wallet = await makeAgoricWalletConnection(watcher, ENDPOINTS.RPC);
  useAppStore.setState({ wallet });

  const { pursesNotifier } = wallet;
  for await (const purses of subscribeLatest<Purse[]>(pursesNotifier)) {
    console.log('Got purses:', purses);
    useAppStore.setState({ purses });
  }
};

const makeSubscriptionOffer = async (user: string) => {
  const { wallet, subscriptionInstance, purses } = useAppStore.getState();

  if (!subscriptionInstance) throw Error('Subscription instance not found');
  if (!purses) throw Error('Purses not loaded');

  const pricePurse = purses.find(purse => purse.brandPetname === 'IST');
  if (!pricePurse) throw Error('IST purse not found');

  const priceAmount = pricePurse.currentAmount;
  wallet?.makeOffer(
    {
      source: 'contract',
      instance: subscriptionInstance,
      publicInvitationMaker: 'makeSubscriptionInvitation',
    },
    { give: { Price: priceAmount } },
    { user },
    (update: { status: string; data?: unknown }) => {
      if (update.status === 'error') {
        alert(`Subscription error: ${update.data}`);
      } else if (update.status === 'accepted') {
        alert('Subscription successful');
      } else if (update.status === 'refunded') {
        alert('Subscription refunded');
      }
    },
  );
};

function App() {
  useEffect(() => {
    setup();
  }, []);

  const { wallet, purses } = useAppStore(({ wallet, purses }) => ({
    wallet,
    purses,
  }));

  const tryConnectWallet = () => {
    connectWallet().catch(err => {
      console.error(err);
      alert('Failed to connect wallet');
    });
  };

  const subscribe = () => {
    const user = prompt('Enter your name for the subscription');
    if (user) {
      makeSubscriptionOffer(user).catch(err => {
        console.error(err);
        alert('Failed to make subscription offer');
      });
    }
  };

  return (
    <>
      <Logos />
      <h1>Subscription DApp</h1>
      <div className="card">
        {wallet ? (
          <>
            <Inventory wallet={wallet} purses={purses || []} />
            <button onClick={subscribe}>Subscribe</button>
          </>
        ) : (
          <button onClick={tryConnectWallet}>Connect Wallet</button>
        )}
      </div>
    </>
  );
}

export default App;
