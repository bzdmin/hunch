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
          {NAME} is a collection of short experiments about how people make
          decisions.
        </p>
        <p className="soft" style={{ maxWidth: "60ch" }}>
          You make a real choice with NIM, predict what another person will
          do, then see what actually happened.
        </p>
        <p className="soft" style={{ maxWidth: "60ch" }}>
          There&rsquo;s no personality test. Your result is simply how close
          your prediction was.
        </p>

        <p className="section-label">The loop</p>
        <div className="loop">
          <div className="step">
            <span className="n">01</span>
            <div>
              <p className="t">Decide</p>
              <p className="d">Make a real choice with NIM.</p>
            </div>
          </div>
          <div className="step">
            <span className="n">02</span>
            <div>
              <p className="t">Lock</p>
              <p className="d">
                Predict what the other person will do. Your prediction is
                locked before they decide.
              </p>
            </div>
          </div>
          <div className="step">
            <span className="n">03</span>
            <div>
              <p className="t">Wait</p>
              <p className="d">They make their choice without seeing yours.</p>
            </div>
          </div>
          <div className="step">
            <span className="n">04</span>
            <div>
              <p className="t">Reveal</p>
              <p className="d">
                See what they chose. Find out how close your prediction was.
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

        <div className="card-grid cols-2">
          <div className="card">
            <h2>Why real NIM?</h2>
            <p className="soft" style={{ marginTop: "0.5rem" }}>
              It&rsquo;s easy to say what you would do when nothing is at
              stake. It feels different when the decision involves something
              real.
            </p>
            <p className="soft" style={{ marginTop: "0.6rem" }}>
              That&rsquo;s why {NAME} uses NIM. What you choose has a real
              consequence, so your decision means something.
            </p>
          </div>

          <div className="card">
            <h2>Your prediction meets reality</h2>
            <p className="soft" style={{ marginTop: "0.5rem" }}>
              Every {NAME} asks you to make a choice and predict someone
              else&rsquo;s choice.
            </p>
            <p className="soft" style={{ marginTop: "0.6rem" }}>
              You might expect them to be generous. They might not be. You
              might trust them to return your NIM. They might keep more than
              you expected.
            </p>
            <p className="soft" style={{ marginTop: "0.6rem" }}>
              {NAME} lets you make the prediction first, then shows you what
              another person actually did.
            </p>
          </div>
        </div>

        <div className="grow" />
        <Link href="/#experiments" className="btn">Choose an experiment</Link>
      </main>
      <Footer />
    </>
  );
}
