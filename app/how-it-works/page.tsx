import Link from "next/link";
import { NAME } from "@/lib/brand";
import { Nav } from "@/app/nav";
import { Footer } from "@/app/footer";

export const metadata = { title: `How ${NAME} works` };

/**
 * A real destination, not the compressed strip on the home screen. That strip
 * is there so a visitor understands the shape of the loop in one glance
 * before ever tapping in, this page is for the person who wants the actual
 * explanation before they touch a wallet.
 */
export default function HowItWorks() {
  return (
    <>
      <Nav />
      <main className="screen wide">
        <div className="page-header">
          <p className="eyebrow">How it works</p>
          <h1>What is {NAME}?</h1>
        </div>

        <p className="soft" style={{ maxWidth: "60ch" }}>
          {NAME} is a handful of short behavioural experiments where your
          decisions involve real NIM. You don&rsquo;t take a personality test.
          Nobody tells you what kind of person you are. You make a real
          choice, then you make a hunch about what someone else will do, then{" "}
          {NAME} shows you what actually happened.
        </p>

        <p className="section-label">The loop</p>
        <div className="loop">
          <div className="step">
            <span className="n">01</span>
            <div>
              <p className="t">Decide</p>
              <p className="d">Make a real decision using NIM. Keeping is always an option.</p>
            </div>
          </div>
          <div className="step">
            <span className="n">02</span>
            <div>
              <p className="t">Lock</p>
              <p className="d">
                Commit to your prediction before the other person decides.
                This is the part that&rsquo;s hard to get right.
              </p>
            </div>
          </div>
          <div className="step">
            <span className="n">03</span>
            <div>
              <p className="t">Wait</p>
              <p className="d">
                The other participant makes their choice. Enforced
                server-side, not just in the interface: the app cannot send
                you their answer before yours is locked in, even if someone
                tried to force it, both sides commit blind and the reveal
                only happens once neither can react to the other.
              </p>
            </div>
          </div>
          <div className="step">
            <span className="n">04</span>
            <div>
              <p className="t">Reveal</p>
              <p className="d">
                See what happened, and compare your prediction with the
                outcome, against other {NAME} players and, where
                there&rsquo;s a real benchmark for it, published
                behavioural research.
              </p>
            </div>
          </div>
          <div className="step">
            <span className="n">05</span>
            <div>
              <p className="t">Share</p>
              <p className="d">Send the experiment to someone else and see what they predict.</p>
            </div>
          </div>
        </div>

        <div className="card">
          <h2>Why real NIM?</h2>
          <p className="soft" style={{ marginTop: "0.5rem" }}>
            If a decision costs nothing, it&rsquo;s easy to say what you think
            you should do. It&rsquo;s a different question once something real
            is behind it. That&rsquo;s the whole reason {NAME} runs on NIM
            instead of points: real NIM gives the decision consequences, and
            consequences are what make a hunch worth having.
          </p>
        </div>

        <div className="card">
          <h2>Your hunch is a hypothesis</h2>
          <p className="soft" style={{ marginTop: "0.5rem" }}>
            Every experiment asks you to do two things: make a decision, then
            predict someone else&rsquo;s. The interesting part is the gap
            between the two. You might think people are more generous than
            they are. You might trust someone who doesn&rsquo;t reciprocate.
            You might reject an offer almost everyone else would take.{" "}
            {NAME} is how you find out which.
          </p>
        </div>

        <div className="grow" />
        <Link href="/#experiments" className="btn">Choose an experiment</Link>
      </main>
      <Footer />
    </>
  );
}
