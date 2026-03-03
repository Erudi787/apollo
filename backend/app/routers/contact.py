import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import resend

router = APIRouter(prefix="/api/contact", tags=["contact"])

class ContactRequest(BaseModel):
    name: str
    email: str
    message: str

@router.post("")
async def submit_contact_form(contact: ContactRequest):
    resend_api_key = os.getenv("RESEND_API_KEY")
    resend_to_email = os.getenv("RESEND_TO_EMAIL")

    if not resend_api_key or not resend_to_email:
        # If the backend isn't configured for emails, just accept it gracefully
        # or return a 500 error. For now, let's log it and fail to let the developer know.
        print("[AI.pollo Error] Resend API keys missing in environment variables.")
        raise HTTPException(status_code=500, detail="Contact form is currently misconfigured on the server.")

    resend.api_key = resend_api_key

    # Validate inputs
    if not contact.name.strip() or not contact.email.strip() or not contact.message.strip():
        raise HTTPException(status_code=400, detail="All fields are required.")

    # Construct the email parameters
    # The default 'from' domain for Resend free tier is 'onboarding@resend.dev'
    # It can only send TO the verified email address (resend_to_email)
    params = {
        "from": "Acme <onboarding@resend.dev>",
        "to": resend_to_email,
        "subject": f"New Contact Request from {contact.name}",
        "html": f"""
        <h2>New Contact Request from AI.pollo</h2>
        <p><strong>Name:</strong> {contact.name}</p>
        <p><strong>Email:</strong> {contact.email}</p>
        <p><strong>Message:</strong></p>
        <blockquote style="border-left: 4px solid #ccc; padding-left: 10px; color: #555;">
            {contact.message}
        </blockquote>
        <br>
        <p><small>Sent via AI.pollo Contact Form</small></p>
        """
    }

    try:
        # Send the email synchronously via the Resend SDK
        # Fast API handles synchronous block fine via threadpool, but resend SDK is quick
        email_response = resend.Emails.send(params)
        return {"success": True, "message": "Your message has been sent successfully."}
    except Exception as e:
        print(f"[AI.pollo Error] Failed to send email via Resend: {e}")
        raise HTTPException(status_code=500, detail="Failed to send message. Please try again later.")
