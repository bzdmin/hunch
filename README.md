# Hunch

**Can you predict people?**

A behavioural experiment you play with real NIM, inside [Nimiq Pay](https://nimiq.com)
on a phone or through [Nimiq Hub](https://hub.nimiq.com) in a normal browser. You make
one real decision, predict what someone else will do, then find out, how you compare
to other Hunch players, and where there's a real benchmark for it, to published
research.

Built for the Nimiq Mini Apps Competition, Cycle II.

Site map:

```
/              pick an experiment
/live          real rounds and recent decisions
/how-it-works  the loop, explained
/research      published benchmarks and methodology
/results       this device's own history
/docs          technical documentation
/split /trust /ultimatum   the three experiments
/terms /privacy            rules and data
```

## The idea

Deciding what *you* would do is easy. Guessing what *other people* do is hard, and
almost everyone is confident and wrong. That gap is the product.

**Split** you hold an amount of NIM and decide how much to pass to the next
stranger who plays. Keeping all of it is a real option. Then you guess what the
average person passes on, and see your answer against Engel's 2011 meta-analysis of
around 600 dictator-game studies.

The money is real, and it travels. What you pass on becomes the next player's
endowment, so a chain moves from stranger to stranger, shrinking each time, until
it falls below a floor, at which point the last person is told the chain ends with
them, and keeps what's left.

**Trust** and **Ultimatum** run on the same two-player engine (`lib/pair.ts`) and
land when house funding does. Both create money through a multiplier or an
endowment, so neither can run on players' own NIM.

## Why it needs Nimiq

The amounts are cents. On any chain with meaningful fees, the fee exceeds the
payload; through a bank, sending 40 cents to a stranger abroad is impossible.
Nimiq Pay makes tiny, instant, feeless transfers ordinary, remove it and the
experiment cannot run at all.

## How the honesty works

The premise is that the money is real, so the code has to be careful in specific
ways:

- **The signed message is copy, not a payload.** Whatever string we pass is what the
  player reads in the wallet dialog before committing. It says what they chose, in
  plain sentences.
- **The server rebuilds that message** from the stored fields and rejects anything
  that doesn't match, so a tampered client can't display one thing and record another.
- **A self-reported address is a payout target, never identity.** Nimiq Pay settles
  from an address it does not disclose, so the paying address is read back off-chain
  and identity is the signing key.
- **Nothing is revealed until both sides have committed.** In two-player experiments
  the server refuses to send one player's move to the other before sealing, enforced
  in the API response itself, not just in the interface.
- **The signature is actually verified**, not just present (`lib/verify.ts`), against
  the exact byte format Nimiq Pay and Nimiq Hub both use, confirmed against real
  signatures from both before shipping.
- **One wallet, two real environments** (`lib/wallet/`): the Mini App SDK inside
  Nimiq Pay, Nimiq Hub in a normal browser, picked automatically, the rest of the
  app never knows which one answered. Neither is a fallback for the other, and
  there is no third, simulated mode.
- **Published figures live in one file** (`lib/benchmarks.ts`) with citations, and
  nothing goes on screen that isn't in it with a source.

## Running it

```bash
npm install
npm run build && npm start        # production build; dev bundles do not run in the
                                  # Nimiq Pay WebView
```

Then open the URL in Nimiq Pay under **Mini Apps → Custom URL**. For testing, the
hidden dev menu (long-press settings for 10 seconds) switches to testnet and hands
out free NIM.

### Environment

| Variable | Purpose |
| --- | --- |
| `POSTGRES_URL` | Production storage. Unset locally, which uses JSON files. |
| `NIMIQ_NETWORK` | `test` or `main`. |
| `NEXT_PUBLIC_POOL_ADDRESS` | Where passed-on NIM is received. |
| `NIMLAB_HOUSE_FUNDED` | `1` enables the windfall mode, once a house wallet is funded. |
| `NIMLAB_DAILY_CAP_LUNA` | Hard ceiling on house spending per day. |

## Licence

MIT, see [LICENSE](LICENSE).
