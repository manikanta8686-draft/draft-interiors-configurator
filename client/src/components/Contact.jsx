import { useState } from "react";
import { ArrowUpRight } from "./Icons";

function Contact() {
  const [sent, setSent] = useState(false);
  function submit(event) { event.preventDefault(); setSent(true); }

  return <main className="contact-page"><div><p className="eyebrow">COME SAY HELLO</p><h1>Let’s make<br /><em>space</em> together.</h1><p>Tell us about your room, your rituals, and the sofa you have in mind. Our design team will be in touch shortly.</p></div><form onSubmit={submit}>{sent ? <div className="form-success" role="status"><p className="eyebrow">ENQUIRY RECEIVED</p><h2>Thank you.</h2><p>We’ll be in touch shortly to talk through your space.</p><button className="text-button" type="button" onClick={() => setSent(false)}>Send another enquiry <ArrowUpRight /></button></div> : <><label>Your name<input required name="name" placeholder="Full name" /></label><label>Email address<input required name="email" type="email" placeholder="you@example.com" /></label><label>Tell us a little more<textarea required name="message" placeholder="I'd like to create a sofa for..." rows="4" /></label><button className="button button-dark">Send enquiry <ArrowUpRight /></button></>}</form></main>;
}

export default Contact;
