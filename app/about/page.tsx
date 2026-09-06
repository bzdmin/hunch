import Link from "next/link";
import { NAME, TAGLINE } from "@/lib/brand";

export const metadata = { title: `What is ${NAME}?` };

/**
 * Where "What is Hunch?" goes.
 *
 * It used to point at "/", which is the game, so someone who tapped a link asking
 * what this was got dropped into a decision about money they had not agreed to make.
 * A stranger arriving from a shared link should be able to find out what this is
 * without a wallet, without spending anything, and without being played.
 *
 * No wallet needed to read this page. That is the point of it.
 */
export default function About() {
  return (
    <main className="screen">
      <p className="eyebrow">{NAME}</p>
      <h1>{TAGLINE}</h1>

      <p className="soft">
        Deciding what <em>you</em> would do with money is easy. Guessing what{" "}
        <em>everyone else</em> does turns out to be very hard, and almost everyone is
        confident and wrong. That gap is what this is about.
      </p>

      <div className="card">
        <h2>How a round works</h2>
        <ol className="steps">
          <li>You&rsquo;re holding an amount of real money.</li>
          <li>
            You choose how much to pass to the next stranger who plays. Keeping all
            of it is a real option.
          </li>
          <li>Before you see anything, you guess what most people do.</li>
          <li>
            Then you find out: your choice, your guess, and what researchers
            found running the same test on thousands of people.
          </li>
        </ol>
      </div>

      <div className="card">
        <h2>The money is real, and it travels</h2>
        <p className="soft" style={{ marginTop: "0.5rem" }}>
          What you pass on becomes the next person&rsquo;s money to decide over. A
          chain moves from stranger to stranger, getting smaller each time, until
          what&rsquo;s left is too small to divide again, and whoever&rsquo;s
          holding it then is told the chain ends with them, and keeps it.
        </p>
      </div>

      <div className="card">
        <h2>Where it&rsquo;s going</h2>
        <p className="soft" style={{ marginTop: "0.5rem" }}>
          Split is the first question. Two more are being built: <strong>Trust</strong>,
          where you hand everything to someone and it triples in their hands,
          and they decide what comes back. And <strong>Ultimatum</strong>, where a
          share you consider insulting can be refused, leaving you both with nothing.
        </p>
        <p className="faint" style={{ marginTop: "0.6rem" }}>
          Each one is a real experiment behavioural scientists have run for decades.
          The difference is that here it&rsquo;s your money, and you find out where
          you sit.
        </p>
      </div>

      {/* Deliberately no figures here. The number people are trying to guess must
          not be readable before they guess it, printing it on the way in turns the
          only interesting question in the product into a reading comprehension test. */}
      <p className="note">
        Every figure you&rsquo;re shown comes from published research and is cited on
        screen, after you&rsquo;ve made your own guess, never before.
      </p>

      <div className="grow" />

      <Link href="/" className="btn">Try a round</Link>
      <p className="faint" style={{ textAlign: "center" }}>
        You&rsquo;ll need Nimiq Pay to take a turn. Reading is free.
      </p>
    </main>
  );
}
