# Hunch

**Can you predict people?**

Hunch is a behavioral experiment you play with real NIM through Nimiq Pay.

You make a real decision, lock your prediction about what another person will do, wait for their independent decision, then reveal the outcome and compare your hunch with other players and published research.

Built for the Nimiq Mini Apps Competition, Cycle II.

## The loop

**Decide → Predict → Wait → Reveal → Compare**

Hunch turns everyday assumptions about people into something you can actually test.

## Experiments

### Split

Bring your own NIM, minimum 1,000 NIM.

Decide how much to keep and how much to pass to the next participant. What you pass forward becomes the next participant's endowment, creating a chain that continues until the remaining amount reaches the terminal floor.

You also predict how much the average person will pass forward.

### Trust

Hunch-funded.

Start a new round with 200-500 NIM or continue an existing waiting round. Pass the NIM to another participant and predict how much they will return.

### Ultimatum

Hunch-funded.

Start a new round with 200-500 NIM or continue an existing waiting round. Make an offer to another participant. They commit to the minimum they would accept before seeing your offer.

## Why Nimiq

Nimiq makes the experiments possible because the NIM involved can move directly through Nimiq Pay without requiring a traditional payment rail.

Nimiq is not just used to pay at the end. The wallet is part of the experiment itself.

## How decisions stay blind

Two-player experiments do not reveal one participant's decision before the other has committed.

1. The participant chooses.
2. Nimiq Pay signs the commitment.
3. Hunch verifies the signature.
4. The server locks the decision.
5. The other participant commits independently.
6. Both decisions are revealed.
7. The resulting NIM settlement is processed.

The server rebuilds the signed message from stored fields and rejects signatures that do not match the recorded decision.

## Wallets

Hunch supports:

- Nimiq Pay Mini App SDK inside Nimiq Pay
- Nimiq Hub in a normal browser

Both use the same commitment and verification model. There is no simulated wallet fallback.

## Research

Published behavioral research is used as context, not as a claim that Hunch exactly reproduces each study.

Research sources and benchmarks are documented in the Hunch Research page.

- **Split Benchmark:** Engel (2011) meta-analysis of 616 dictator game treatments across 129 studies (28.3% average given).
- **Research Transparency:** All benchmark figures and academic citations are documented in [`lib/benchmarks.ts`](lib/benchmarks.ts) and accessible on `/research`.

## Product surfaces

- `/` - choose an experiment
- `/split` - Split experiment
- `/trust` - Trust experiment
- `/ultimatum` - Ultimatum experiment
- `/how-it-works` - product loop
- `/research` - research sources and benchmarks
- `/results` - local round history
- `/live` - public activity feed
- `/docs` - technical documentation
- `/terms` - terms
- `/privacy` - privacy

## Run locally

```bash
npm install
npm run build
npm start
```

Then open the deployed URL in Nimiq Pay under **Mini Apps → Custom URL**.

For development and testing, see the project documentation.

### Environment variables

| Variable | Purpose |
| --- | --- |
| `POSTGRES_URL` | Production PostgreSQL storage. Unset locally to use local JSON file storage. |
| `NIMIQ_NETWORK` | `test` or `main`. |
| `NEXT_PUBLIC_POOL_ADDRESS` | Where passed-on NIM in Split is received. |
| `NIMLAB_HOUSE_FUNDED` | `1` enables windfall mode (Trust & Ultimatum) once the house wallet is funded. |
| `NIMLAB_DAILY_CAP_LUNA` | Hard ceiling on house spending per day. |

## Security and privacy

Hunch does not access private keys.

Wallet signatures are verified server-side before decisions are accepted. Two-player decisions remain hidden until both participants have committed.

See:
- [Terms](/terms)
- [Privacy](/privacy)
- [Technical documentation](/docs)

## License

MIT
