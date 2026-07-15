import EnquiryForm from "./EnquiryForm.jsx";
import { ENQUIRY_EMAIL } from "../config/contact.js";

function Contact() {
  return <main className="contact-page"><div><p className="eyebrow">COME SAY HELLO</p><h1>Let’s make<br /><em>space</em> together.</h1><p>Tell us about your room, your rituals, and the sofa you have in mind. Our design team will be in touch shortly.</p><a className="contact-email" href={`mailto:${ENQUIRY_EMAIL}`}>{ENQUIRY_EMAIL}</a></div><EnquiryForm source="contact" /></main>;
}

export default Contact;
