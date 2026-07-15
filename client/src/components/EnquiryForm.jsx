import { useRef, useState } from "react";
import { ArrowUpRight } from "./Icons";
import { createEnquiry, createEnquirySubmissionId } from "../services/enquiriesApi.js";

export default function EnquiryForm({
  source,
  configuration = null,
  defaultMessage = "",
  submitLabel = "Send enquiry",
  createWhatsAppUrl = null,
}) {
  const [result, setResult] = useState({ status: "idle", message: "", reference: "" });
  const [customerName, setCustomerName] = useState("");
  const submitting = useRef(false);
  const submissionId = useRef(null);
  const whatsappUrl = createWhatsAppUrl?.(customerName) ?? null;

  async function submit(event) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    const form = event.currentTarget;
    const fields = new FormData(form);
    submissionId.current ??= createEnquirySubmissionId();
    setResult({ status: "submitting", message: "Sending your enquiry...", reference: "" });
    try {
      const receipt = await createEnquiry({
        source,
        submissionId: submissionId.current,
        customer: {
          name: fields.get("name"),
          email: fields.get("email"),
          phone: fields.get("phone"),
        },
        message: fields.get("message"),
        consent: fields.get("consent") === "on",
        website: fields.get("website"),
        configuration,
      });
      form.reset();
      submissionId.current = null;
      setCustomerName("");
      setResult({
        status: "success",
        message: "Your enquiry has been received. Our design team will be in touch shortly.",
        reference: receipt.id,
      });
    } catch (error) {
      setResult({ status: "error", message: error.message, reference: "" });
    } finally {
      submitting.current = false;
    }
  }

  if (result.status === "success") {
    return <div className="form-success" role="status">
      <p className="eyebrow">ENQUIRY RECEIVED</p>
      <h2>Thank you.</h2>
      <p>{result.message}</p>
      <small>Reference: {result.reference}</small>
      <button className="text-button" type="button" onClick={() => setResult({ status: "idle", message: "", reference: "" })}>Send another enquiry <ArrowUpRight /></button>
    </div>;
  }

  return <form className="enquiry-form" onSubmit={submit}>
    <label>Your name<input required name="name" maxLength="80" autoComplete="name" placeholder="Full name" value={customerName} onChange={(event) => setCustomerName(event.target.value)} /></label>
    <label>Email address<input required name="email" maxLength="254" type="email" autoComplete="email" placeholder="you@example.com" /></label>
    <label>Phone number <span>(optional)</span><input name="phone" maxLength="30" type="tel" autoComplete="tel" inputMode="tel" pattern="[+0-9 \(\)\-]{8,30}" title="Enter a valid phone number with at least 8 digits." placeholder="+91" /></label>
    <label>Tell us a little more<textarea required name="message" minLength="10" maxLength="2000" defaultValue={defaultMessage} placeholder="I'd like to create a sofa for..." rows="4" /></label>
    <label className="enquiry-consent"><input required name="consent" type="checkbox" /> I agree that Draft Interiors may use these details to respond to my enquiry.</label>
    <label className="enquiry-honeypot" aria-hidden="true">Website<input name="website" tabIndex="-1" autoComplete="off" /></label>
    <button type="submit" className="button button-dark" disabled={result.status === "submitting"}>{result.status === "submitting" ? "Sending..." : submitLabel} <ArrowUpRight /></button>
    {createWhatsAppUrl && (whatsappUrl
      ? <a className="enquiry-whatsapp" href={whatsappUrl} target="_blank" rel="noreferrer">Continue on WhatsApp <span>↗</span></a>
      : <p className="enquiry-whatsapp-hint">Enter your name to prepare a complete WhatsApp quote message.</p>)}
    {result.status === "error" && <p className="enquiry-error" role="alert">{result.message}</p>}
  </form>;
}
